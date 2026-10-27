-- `frogger` reemplaza al placeholder simulado `ranaria`: se elimina esa fila (sin scores
-- asociados) y `frogger` ocupa su posición en el catálogo.
delete from public.games where id = 'ranaria';
update public.games set sort_order = 7 where id = 'frogger';
