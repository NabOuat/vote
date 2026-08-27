/** Fisher-Yates in-place shuffle — utilisé pour casser l'ordre d'insertion des
 * bulletins avant leur migration de ballots_staging vers ballots (anonymat). */
export function shuffle(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[array[i], array[j]] = [array[j], array[i]]
  }
  return array
}
