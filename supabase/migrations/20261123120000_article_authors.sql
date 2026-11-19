-- Who wrote an article, as readers see it: a name and a photo, kept on the article. Visitors
-- cannot read the team (`agents`), and should not be able to, so the two things a byline
-- needs are copied onto each article and kept in step by triggers.

alter table public.articles
  add column author_name text,
  add column author_photo text;

-- Called when an article is made or given another author.
create function private.copy_article_author() returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if tg_op = 'INSERT' or new.author_id is distinct from old.author_id then
    select name, photo into new.author_name, new.author_photo
    from public.agents where user_id = new.author_id;
    if new.author_id is null then
      new.author_name := null;
      new.author_photo := null;
    end if;
  end if;
  return new;
end;
$$;

-- Runs after `articles_prepare`, which sets the author of a new article.
create trigger articles_zz_copy_author before insert or update on public.articles
  for each row execute function private.copy_article_author();

-- A team member who changes their name or photo changes it on every article they wrote.
create function private.refresh_article_authors() returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  update public.articles
  set author_name = new.name, author_photo = new.photo
  where author_id = new.user_id;
  return null;
end;
$$;

create trigger agents_refresh_article_authors after update of name, photo on public.agents
  for each row execute function private.refresh_article_authors();

update public.articles a
set author_name = g.name, author_photo = g.photo
from public.agents g
where g.user_id = a.author_id;
