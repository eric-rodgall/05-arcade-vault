-- Añade `frogger` al catálogo (SPEC game-jam/frogger/01-frogger-core).
-- Sustituye al placeholder `ranaria` (se elimina en la migración siguiente).
-- `color` usa 'green' (el check de `games.color` no admite 'lime') y `cover` reutiliza
-- la portada existente `cover-rana`.
insert into public.games (id, title, short, "long", cat, cover, color, best, plays, sort_order) values
('frogger', 'FROGGER', 'Cruza la carretera y el río sin convertirte en papilla.', 'Guía a tu rana a través de una carretera repleta de coches y un río de troncos y tortugas flotantes. Llena las cinco bocas del otro lado para completar la ronda; cada nivel acelera el tráfico y acorta el tiempo. Tres vidas y mucho asfalto por delante.', 'ARCADE', 'cover-rana', 'green', 0, '0', 9);
