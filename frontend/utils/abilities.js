export function getRandomAbility() {
    const rand = Math.random();

    if (rand > 0.40 && rand < 0.50) return "bombs";
    if (rand > 0.50 && rand < 0.60) return "speed";
    if (rand > 0.60 && rand < 0.70) return "flames";

    return null;
}


export function isPlayerIntheAbilityTile(playerRow, playerCol, ability) {
    return playerRow === ability.row && playerCol === ability.col;
}