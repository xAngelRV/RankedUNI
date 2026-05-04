/**
 * Calcula el nuevo ELO para dos jugadores después de una partida.
 * 
 * @param {number} ratingA ELO actual del jugador A
 * @param {number} ratingB ELO actual del jugador B
 * @param {number} scoreA Resultado para el jugador A (1 = victoria, 0.5 = empate, 0 = derrota)
 * @param {number} kFactor Factor K que determina la volatilidad (por defecto 32)
 * @returns {Object} Un objeto con los nuevos ELOs { newRatingA, newRatingB }
 */
function calculateElo(ratingA, ratingB, scoreA, kFactor = 32) {
  // Calcular el puntaje esperado para cada jugador
  const expectedScoreA = 1 / (1 + Math.pow(10, (ratingB - ratingA) / 400));
  const expectedScoreB = 1 / (1 + Math.pow(10, (ratingA - ratingB) / 400));

  // El resultado de B es el inverso del de A
  const scoreB = 1 - scoreA;

  // Calcular nuevos ratings
  const newRatingA = Math.round(ratingA + kFactor * (scoreA - expectedScoreA));
  const newRatingB = Math.round(ratingB + kFactor * (scoreB - expectedScoreB));

  return { newRatingA, newRatingB };
}

module.exports = { calculateElo };
