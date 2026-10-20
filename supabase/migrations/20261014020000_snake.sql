-- Renombra `serpentina` a SNAKE (el slug/URL no cambia) y corrige su descripción:
-- el juego real usa frutas y velocidad fija, no núcleos magenta ni velocidad creciente.
update public.games
set title = 'SNAKE',
    "long" = 'Una serpiente de neón recorre la grilla en busca de frutas. Cada bocado suma 10 puntos y la alarga un segmento. Choca contra una pared o contra tu propio cuerpo y la partida termina.'
where id = 'serpentina';
