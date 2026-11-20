"use client";

/*
 * A React Three Fiber frame loop moves three.js objects and uniforms in place every frame, by
 * design, rather than through React state. The compiler's rules about refs and immutable values
 * do not fit that, so they are off for this file only.
 */
/* eslint-disable react-hooks/immutability, react-hooks/refs */

import { Line, PerspectiveCamera, View } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  BackSide,
  DoubleSide,
  Color,
  ExtrudeGeometry,
  Shape,
  ShaderMaterial,
  ShapeGeometry,
  SphereGeometry,
  type BufferGeometry,
  type Group,
  type Mesh,
} from "three";

import { afterScroll } from "@/motion/scroll-sync";
import { useInk, wobble, type BoilUniform } from "@/scenes/lines";
import { FirstFrame } from "@/scenes/scene-canvas";

import { onWrenFrame, wrenFrame } from "./state";

/*
 * The wren in 3D, drawn as ink on paper: solid shapes filled with the paper colour and outlined
 * by an inverted hull, so the outline is the true silhouette from any angle, and fat ink lines
 * for the wings, legs, brow and tail feathers. A small procedural rig moves it: wing beats with
 * follow-through, a bob in time with them, a tail that fans to steer, a head that looks where it
 * is going (and at the reader when perched), blinks, hops and preening. It banks into turns,
 * pitches up to climb, tucks to glide and flares to land. Every change goes through a spring.
 */

const FOV = 30;
/** Pixels per unit of the bird's own geometry, per pixel of the logo box it stands in. */
const BODY_SCALE = 0.56;
/** The pen's width, in screen pixels, as on the logo at this size. */
const INK_PX = 2.1;
/** The boil of the hand-drawn wobble, a step every 125ms while the bird moves. */
const BOIL_MS = 125;
/** How quickly each part of the rig follows its target (higher is quicker). */
const SPRING = { pose: 7, body: 6, head: 9, wings: 10, tail: 7 } as const;
/** Wing beats a second when climbing hard. A wren beats fast. */
const FLAP_HZ = 7;
/** A frame is drawn on demand; while anything moves, another frame is asked for. */
const SETTLED = 0.0015;

type Side = 1 | -1;

/** Wing panels in each joint's own space, as [x, z] with z towards the tip (mirrored per side). */
const UPPER_ARM: readonly (readonly [number, number])[] = [
  [0.02, 0],
  [0.04, 0.27],
  [-0.2, 0.25],
  [-0.24, 0.03],
];
const FOREARM: readonly (readonly [number, number])[] = [
  [0.02, 0],
  [-0.03, 0.29],
  [-0.27, 0.27],
  [-0.22, 0.02],
];
const HAND: readonly (readonly [number, number])[] = [
  [0.01, 0],
  [-0.02, 0.44],
  [-0.12, 0.42],
  [-0.24, 0.32],
  [-0.3, 0.16],
  [-0.24, 0.0],
];
/** Lines from the wrist between the primary feathers. */
const PRIMARIES: readonly (readonly [number, number])[] = [
  [-0.09, 0.4],
  [-0.18, 0.34],
  [-0.25, 0.24],
];

function WingPanel({
  side,
  outline,
  paper,
  lineProps,
}: {
  side: Side;
  outline: readonly (readonly [number, number])[];
  paper: string;
  lineProps: {
    color: string;
    lineWidth: number;
    ref: (line: { material?: unknown } | null) => void;
  };
}) {
  const geometry = useMemo(() => {
    const shape = new Shape();
    outline.forEach(([x, z], index) => {
      if (index === 0) shape.moveTo(x, side * z);
      else shape.lineTo(x, side * z);
    });
    shape.closePath();
    const flat = new ShapeGeometry(shape);
    // The shape is drawn in x and y; the wing lies in x and z.
    flat.rotateX(Math.PI / 2);
    return flat;
  }, [outline, side]);
  const points = useMemo(
    () =>
      [...outline, outline[0] ?? [0, 0]].map(
        ([x, z]) => [x, 0, side * z] as [number, number, number],
      ),
    [outline, side],
  );
  return (
    <>
      <mesh geometry={geometry}>
        <meshBasicMaterial color={paper} side={DoubleSide} />
      </mesh>
      <Line {...lineProps} points={points} />
    </>
  );
}

interface Rig {
  root: Group | null;
  orient: Group | null;
  head: Group | null;
  tail: Group | null;
  feathers: (Group | null)[];
  legs: (Group | null)[];
  eyes: (Mesh | null)[];
  folded: (Group | null)[];
  shoulder: Record<Side, Group | null>;
  elbow: Record<Side, Group | null>;
  wrist: Record<Side, Group | null>;
}

/** A value that eases towards its target, frame-rate independent. */
function follow(value: number, target: number, rate: number, dt: number): number {
  return value + (target - value) * (1 - Math.exp(-rate * dt));
}

/** The shortest way round from one angle to another. */
function towards(value: number, target: number, rate: number, dt: number): number {
  let delta = target - value;
  while (delta > Math.PI) delta -= Math.PI * 2;
  while (delta < -Math.PI) delta += Math.PI * 2;
  return value + delta * (1 - Math.exp(-rate * dt));
}

/** An ellipsoid with its scale baked in, so its normals (and so its outline) are true. */
function ellipsoid(rx: number, ry: number, rz: number): BufferGeometry {
  const geometry = new SphereGeometry(1, 28, 20);
  geometry.scale(rx, ry, rz);
  geometry.computeVertexNormals();
  return geometry;
}

/** The ink outline: the same shape, pushed out along its normals and drawn from behind. */
function outlineMaterial(boil: BoilUniform, width: { value: number }): ShaderMaterial {
  return new ShaderMaterial({
    side: BackSide,
    uniforms: { uColor: { value: new Color("#1a1a1a") }, uBoil: boil, uWidth: width },
    vertexShader: `
      uniform float uBoil;
      uniform float uWidth;
      void main() {
        float wobble = 1.0 + 0.28 * sin(position.x * 9.0 + uBoil * 2.1) * sin(position.y * 7.0 - uBoil * 1.3);
        vec3 pushed = position + normal * uWidth * wobble;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(pushed, 1.0);
      }
    `,
    fragmentShader: `
      uniform vec3 uColor;
      void main() { gl_FragColor = vec4(uColor, 1.0); }
    `,
  });
}

function Bird() {
  const { invalidate, size: viewport } = useThree();
  const { ink } = useInk();
  const paper = useMemo(() => {
    const value = getComputedStyle(document.documentElement).getPropertyValue("--card").trim();
    return value || "#ffffff";
    // The paper follows the theme with the ink.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ink]);

  const boil = useMemo<BoilUniform>(() => ({ value: 0 }), []);
  const outlineWidth = useMemo(() => ({ value: 0.03 }), []);
  const outline = useMemo(() => outlineMaterial(boil, outlineWidth), [boil, outlineWidth]);
  const withWobble = useMemo(() => wobble(boil), [boil]);
  useEffect(() => {
    (outline.uniforms.uColor?.value as Color).set(ink);
  }, [ink, outline]);

  const geometry = useMemo(() => {
    const tail = new Shape();
    tail.moveTo(0, -0.05);
    tail.quadraticCurveTo(-0.22, 0.12, -0.36, 0.5);
    tail.lineTo(-0.27, 0.53);
    tail.quadraticCurveTo(-0.13, 0.2, 0.04, 0.05);
    tail.closePath();
    return {
      body: ellipsoid(0.5, 0.4, 0.34),
      head: ellipsoid(0.23, 0.22, 0.2),
      eye: new SphereGeometry(0.035, 10, 8),
      feather: new ExtrudeGeometry(tail, { depth: 0.02, bevelEnabled: false, curveSegments: 6 }),
    };
  }, []);

  const rig = useRef<Rig>({
    root: null,
    orient: null,
    head: null,
    tail: null,
    feathers: [],
    legs: [],
    eyes: [],
    folded: [],
    shoulder: { 1: null, [-1]: null },
    elbow: { 1: null, [-1]: null },
    wrist: { 1: null, [-1]: null },
  });

  // Everything the rig eases between, and the clocks of its idle life.
  const motion = useRef({
    x: 0,
    y: 0,
    scale: 40,
    yaw: -0.6,
    pitch: 0,
    roll: 0,
    spread: 0,
    flap: 0,
    phase: 0,
    tuck: 1,
    legsForward: 0,
    tailCock: 0.25,
    tailFan: 0.15,
    headYaw: 0,
    headPitch: 0,
    headRoll: 0,
    lastX: 0,
    lastY: 0,
    lastHeading: 0,
    speed: 0,
    hop: 0,
    hopAt: -10,
    actionAt: 0,
    action: "none",
    blinkAt: 2,
    seenReacts: 0,
    lastHere: "",
    boilAt: 0,
  });

  // Ask for frames while the page scrolls or the flight moves the bird.
  useEffect(() => {
    const stopScroll = afterScroll(() => {
      invalidate();
    });
    const stopFrame = onWrenFrame(() => {
      invalidate();
    });
    const idle = window.setInterval(() => {
      invalidate();
    }, 400);
    return () => {
      stopScroll();
      stopFrame();
      window.clearInterval(idle);
    };
  }, [invalidate]);

  useFrame((state, delta) => {
    const dt = Math.min(delta, 1 / 20);
    const now = state.clock.elapsedTime;
    const m = motion.current;
    const r = rig.current;
    const frame = wrenFrame;
    if (!r.root || !r.orient || !frame.ready) return;

    // Screen position of the feet: the flight's page position, less the scroll.
    const targetX = frame.x - viewport.width / 2;
    const targetY = viewport.height / 2 - (frame.y - window.scrollY);
    const moved = Math.hypot(frame.x - m.lastX, frame.y - m.lastY);
    m.speed = follow(m.speed, moved / Math.max(dt, 1e-3), 4, dt);
    const heading = Math.atan2(-(frame.y - m.lastY), frame.x - m.lastX);
    const turn = moved > 0.5 ? heading - m.lastHeading : 0;
    if (moved > 0.5) m.lastHeading = heading;
    m.lastX = frame.x;
    m.lastY = frame.y;
    m.x = targetX;
    m.y = targetY;
    m.scale = follow(m.scale, frame.size * BODY_SCALE, SPRING.pose, dt);

    // The pose the mode asks for.
    const mode = frame.mode;
    const flying = mode === "climbing" || mode === "gliding" || mode === "landing";
    const perched = mode === "perched" || mode === "asleep";
    const right = frame.direction === 1;
    const facing = right ? -0.55 : -(Math.PI - 0.55);
    const atRest = right ? -0.85 : -(Math.PI - 0.85);
    const pitchTarget =
      mode === "climbing" ? 0.32 : mode === "gliding" ? -0.16 : mode === "landing" ? 0.55 : 0;
    const spreadTarget =
      mode === "climbing" ? 1 : mode === "gliding" ? 0.85 : mode === "landing" ? 1 : 0;
    const flapTarget =
      mode === "climbing"
        ? Math.min(1, 0.45 + m.speed / 900)
        : mode === "landing"
          ? 0.35
          : mode === "gliding"
            ? // In the air it never freezes: a light flutter, stronger when it moves fast.
              Math.min(0.45, 0.22 + m.speed / 2400)
            : 0;
    const bankTarget = flying ? Math.max(-0.6, Math.min(0.6, turn * 14)) : 0;

    m.yaw = towards(m.yaw, perched ? atRest : facing, SPRING.body, dt);
    m.pitch = follow(m.pitch, pitchTarget, SPRING.body, dt);
    m.roll = follow(m.roll, bankTarget * (right ? 1 : -1), SPRING.body, dt);
    m.spread = follow(m.spread, spreadTarget, SPRING.wings, dt);
    m.flap = follow(m.flap, flapTarget, SPRING.wings, dt);
    m.tuck = follow(m.tuck, flying ? (mode === "landing" ? 0 : 1) : 0, SPRING.pose, dt);
    m.legsForward = follow(m.legsForward, mode === "landing" ? 1 : 0, SPRING.pose, dt);
    m.tailCock = follow(
      m.tailCock,
      mode === "landing" ? -0.35 : flying ? 0.05 : 0.3,
      SPRING.tail,
      dt,
    );
    // The tail fans to steer: wider in a turn and when landing.
    m.tailFan = follow(
      m.tailFan,
      mode === "landing" ? 0.55 : flying ? 0.12 + Math.abs(bankTarget) * 0.6 : 0.18,
      SPRING.tail,
      dt,
    );
    m.phase += dt * Math.PI * 2 * FLAP_HZ * (0.4 + m.flap * 0.6) * (m.flap > 0.02 ? 1 : 0);

    // Idle life on a perch: blinks, head tilts, preening, a shuffle, a hop.
    if (frame.here !== m.lastHere) {
      m.lastHere = frame.here;
      if (frame.here && mode === "perched") {
        m.action = "hop";
        m.actionAt = now;
      }
    }
    if (frame.reacts !== m.seenReacts) {
      m.seenReacts = frame.reacts;
      m.action = "hop";
      m.actionAt = now;
    }
    if (mode === "perched" && now - m.actionAt > 3.2 + (Math.sin(m.actionAt * 7.1) + 1) * 1.6) {
      const choices = ["tilt", "preen", "shuffle", "hop"] as const;
      m.action = choices[Math.floor((Math.sin(now * 3.7) + 1) * 2) % choices.length] ?? "tilt";
      m.actionAt = now;
    }
    const t = now - m.actionAt;
    let hop = 0;
    let shuffle = 0;
    let headYawTarget = perched ? -m.yaw - Math.PI / 2 + 0.25 : 0;
    let headPitchTarget = flying ? -m.pitch * 0.6 : 0;
    let headRollTarget = 0;
    if (mode === "asleep") {
      headYawTarget = right ? 2.4 : -2.4;
      headPitchTarget = -0.5;
    } else if (perched) {
      if (m.action === "hop" && t < 0.45) hop = Math.sin((t / 0.45) * Math.PI) * 0.35;
      if (m.action === "tilt" && t < 1.1) headRollTarget = Math.sin((t / 1.1) * Math.PI) * 0.45;
      if (m.action === "preen" && t < 1.4) {
        headYawTarget = (right ? 1 : -1) * 2.1;
        headPitchTarget = -0.45 + Math.sin(t * 18) * 0.06;
      }
      if (m.action === "shuffle" && t < 0.8) shuffle = Math.sin(t * Math.PI * 5) * 0.06;
    }
    m.headYaw = towards(m.headYaw, headYawTarget, SPRING.head, dt);
    m.headPitch = follow(m.headPitch, headPitchTarget, SPRING.head, dt);
    m.headRoll = follow(m.headRoll, headRollTarget, SPRING.head, dt);

    // Blinks: a quick close every few seconds; asleep, the eyes stay shut.
    if (now > m.blinkAt + 0.14) m.blinkAt = now + 2.6 + (Math.sin(now * 5.3) + 1) * 1.8;
    const blinking = mode === "asleep" || (now > m.blinkAt && now < m.blinkAt + 0.14);
    for (const eye of r.eyes)
      if (eye) eye.scale.y = follow(eye.scale.y, blinking ? 0.12 : 1, 30, dt);

    // Place the rig.
    const beat = Math.sin(m.phase);
    const bob = -beat * 0.05 * m.flap;
    const breathe = mode === "asleep" ? Math.sin(now * 1.3) * 0.02 : 0;
    r.root.position.set(m.x + shuffle * m.scale, m.y + (hop + bob) * m.scale, 0);
    r.root.scale.setScalar(m.scale);
    r.orient.rotation.set(m.roll, m.yaw, m.pitch, "YZX");
    r.orient.scale.set(1 + breathe, 1 - breathe + (hop > 0 ? -hop * 0.15 : 0), 1 + breathe);
    if (r.head) r.head.rotation.set(m.headRoll, m.headYaw, m.headPitch, "YZX");
    if (r.tail) r.tail.rotation.set(0, 0, m.tailCock);
    r.feathers.forEach((feather, index) => {
      if (feather) feather.rotation.set((index - 1) * m.tailFan, 0, 0);
    });
    for (const leg of r.legs) {
      if (leg) leg.rotation.z = -1.25 * m.tuck + 0.75 * m.legsForward;
    }
    for (const side of [1, -1] as const) {
      const shoulder = r.shoulder[side];
      const elbow = r.elbow[side];
      const wrist = r.wrist[side];
      if (!shoulder || !elbow || !wrist) continue;
      const folded = 1 - m.spread;
      // The open wing grows out of the shoulder as it spreads; closed, the folded wing on the
      // body's side stands for it, as on the logo.
      shoulder.scale.setScalar(Math.max(0.001, Math.min(1, m.spread * 1.4)));
      shoulder.visible = m.spread > 0.04;
      // Up and down, the hand trailing the arm: follow-through on the primaries.
      const lift = m.flap * 0.95;
      const forward = m.legsForward * 0.45;
      shoulder.rotation.set(
        -side * (lift * beat + 0.12 * m.spread),
        side * (-1.35 * folded + forward),
        0,
        "YXZ",
      );
      elbow.rotation.set(
        -side * lift * 0.45 * Math.sin(m.phase - 0.6),
        side * 2.3 * folded,
        0,
        "YXZ",
      );
      wrist.rotation.set(
        -side * lift * 0.6 * Math.sin(m.phase - 1.2),
        side * -2.1 * folded,
        0,
        "YXZ",
      );
    }

    for (const wing of r.folded) if (wing) wing.visible = m.spread < 0.45;

    // The outline is as wide as the pen, whatever the size.
    outlineWidth.value = INK_PX / m.scale;

    // Step the boil while anything moves, and keep drawing until everything has settled.
    const busy =
      flying ||
      Math.abs(m.yaw - (perched ? atRest : facing)) > SETTLED ||
      Math.abs(m.spread - spreadTarget) > SETTLED * 10 ||
      Math.abs(m.flap - flapTarget) > SETTLED * 10 ||
      Math.abs(m.headYaw - headYawTarget) > SETTLED * 10 ||
      hop > 0 ||
      (perched && t < 1.5) ||
      // Asleep, it breathes; blinking is true all the while its eyes are shut.
      blinking;
    if (busy && now - m.boilAt > BOIL_MS / 1000) {
      boil.value += 1;
      m.boilAt = now;
    }
    if (busy) invalidate();
  });

  const lineProps = { color: ink, lineWidth: INK_PX, ref: withWobble } as const;
  const setRig =
    <K extends keyof Rig>(key: K) =>
    (value: Rig[K]) => {
      rig.current[key] = value;
    };

  return (
    <group ref={setRig("root")}>
      <group ref={setRig("orient")} position={[0, 0.62, 0]}>
        {/* Body */}
        <mesh geometry={geometry.body}>
          <meshBasicMaterial color={paper} />
        </mesh>
        <mesh geometry={geometry.body} material={outline} />
        {/* Head, beak, eyes and brows */}
        <group ref={setRig("head")} position={[0.34, 0.26, 0]}>
          <mesh geometry={geometry.head}>
            <meshBasicMaterial color={paper} />
          </mesh>
          <mesh geometry={geometry.head} material={outline} />
          <Line
            {...lineProps}
            points={[
              [0.22, 0.02, 0.05],
              [0.46, -0.02, 0],
              [0.22, -0.07, -0.05],
              [0.22, 0.02, 0.05],
            ]}
          />
          <Line
            {...lineProps}
            points={[
              [0.22, 0.02, 0.05],
              [0.46, -0.02, 0],
              [0.22, -0.07, 0.05],
            ]}
          />
          {([1, -1] as const).map((side, index) => (
            <group key={side}>
              <mesh
                ref={(eye) => {
                  rig.current.eyes[index] = eye;
                }}
                geometry={geometry.eye}
                position={[0.11, 0.05, side * 0.17]}
              >
                <meshBasicMaterial color={ink} />
              </mesh>
              <Line
                {...lineProps}
                points={[
                  [0.01, 0.12, side * 0.13],
                  [0.1, 0.16, side * 0.12],
                  [0.18, 0.12, side * 0.09],
                ]}
              />
            </group>
          ))}
        </group>
        {/* The tail: three feathers on a pivot, cocked up, fanning to steer */}
        <group ref={setRig("tail")} position={[-0.4, 0.06, 0]}>
          {[0, 1, 2].map((index) => (
            <group
              key={index}
              ref={(feather) => {
                rig.current.feathers[index] = feather;
              }}
            >
              <mesh geometry={geometry.feather} position={[0, 0, -0.01]}>
                <meshBasicMaterial color={paper} />
              </mesh>
              <mesh geometry={geometry.feather} position={[0, 0, -0.01]} material={outline} />
            </group>
          ))}
        </group>
        {/* Legs, tucked in flight, forward to land */}
        {([1, -1] as const).map((side, index) => (
          <group
            key={side}
            ref={(leg) => {
              rig.current.legs[index] = leg;
            }}
            position={[0.02, -0.34, side * 0.1]}
          >
            <Line
              {...lineProps}
              points={[
                [0, 0, 0],
                [0.02, -0.26, 0],
                [0.14, -0.28, 0],
              ]}
            />
            <Line
              {...lineProps}
              points={[
                [0.02, -0.26, 0],
                [-0.08, -0.29, 0],
              ]}
            />
          </group>
        ))}
        {/* The folded wing, a curve on each side, as on the logo */}
        {([1, -1] as const).map((side, index) => (
          <group
            key={side}
            ref={(group) => {
              rig.current.folded[index] = group;
            }}
          >
            <Line
              {...lineProps}
              points={[
                [0.18, 0.06, side * 0.3],
                [0.02, -0.12, side * 0.34],
                [-0.2, -0.12, side * 0.32],
                [-0.36, 0.02, side * 0.24],
              ]}
            />
          </group>
        ))}
        {/* Wings: shoulder, elbow and wrist. Each part is a paper panel with an ink edge, so
            the open wing reads as a drawn shape from any angle; the hand fans into primaries. */}
        {([1, -1] as const).map((side) => (
          <group
            key={side}
            position={[0.06, 0.14, side * 0.28]}
            ref={(group) => {
              rig.current.shoulder[side] = group;
            }}
          >
            <WingPanel side={side} outline={UPPER_ARM} paper={paper} lineProps={lineProps} />
            <group
              position={[0.02, 0, side * 0.26]}
              ref={(group) => {
                rig.current.elbow[side] = group;
              }}
            >
              <WingPanel side={side} outline={FOREARM} paper={paper} lineProps={lineProps} />
              <group
                position={[-0.04, 0, side * 0.28]}
                ref={(group) => {
                  rig.current.wrist[side] = group;
                }}
              >
                <WingPanel side={side} outline={HAND} paper={paper} lineProps={lineProps} />
                {PRIMARIES.map((tip) => (
                  <Line
                    key={tip.join()}
                    {...lineProps}
                    lineWidth={INK_PX * 0.7}
                    points={[
                      [0, 0.001, 0],
                      [tip[0], 0.001, side * tip[1]],
                    ]}
                  />
                ))}
              </group>
            </group>
          </group>
        ))}
      </group>
    </group>
  );
}

/** The wren, as a View of the page's one canvas, over the whole screen. */
export function Wren3D({ onReady }: { onReady: () => void }) {
  // The camera stands back just far enough that one unit is one CSS pixel where the wren flies.
  const [height, setHeight] = useState(() => window.innerHeight);
  useEffect(() => {
    const onResize = () => {
      setHeight(window.innerHeight);
    };
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
    };
  }, []);
  const distance = height / 2 / Math.tan(((FOV / 2) * Math.PI) / 180);
  return (
    <View className="pointer-events-none fixed inset-0">
      <PerspectiveCamera
        makeDefault
        fov={FOV}
        position={[0, 0, distance]}
        near={distance / 10}
        far={distance * 3}
      />
      <Bird />
      <FirstFrame onReady={onReady} />
    </View>
  );
}
