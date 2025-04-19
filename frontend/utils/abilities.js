export function getRandomAbility() {
    const rand = Math.random(); // value between 0 and 1

    if (rand < 0.75) return "speed";
    if (rand < 0.80) return "bomb";
    if (rand < 0.85) return "flames";

    return null; // 85% chance to get nothing
}

// Check if the player's position matches the position of the ability
export function isPlayerIntheAbilityTile(playerRow, playerCol, ability) {
    return playerRow === ability.row && playerCol === ability.col;
}