export function getRandomAbility() {
    const rand = Math.random();

    if (rand < 0.75) return "bombs";
    if (rand < 0.80) return "speed";
    if (rand < 0.85) return "flames";

    return null;
}


export function isPlayerIntheAbilityTile(playerRow, playerCol, ability) {
    return playerRow === ability.row && playerCol === ability.col;
}