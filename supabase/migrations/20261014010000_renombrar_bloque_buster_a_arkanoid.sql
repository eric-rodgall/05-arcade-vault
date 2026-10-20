-- Renombra el título visible del juego `bloque-buster` a ARKANOID (el slug/URL no cambia).
update public.games set title = 'ARKANOID' where id = 'bloque-buster';
