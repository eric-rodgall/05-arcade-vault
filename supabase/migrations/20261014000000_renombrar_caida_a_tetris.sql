-- Renombra el título visible del juego `caida` a TETRIS (el slug/URL no cambia).
update public.games set title = 'TETRIS' where id = 'caida';
