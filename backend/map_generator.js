export function generateMap() {
    const rows = 13;
    const cols = 15;
    const tiles = Array(rows).fill().map(() => Array(cols).fill(0));

    for (let i = 0; i < rows; i++) {
        for (let j = 0; j < cols; j++) {
            if (i === 0 || i === rows - 1 || j === 0 || j === cols - 1 || (i % 2 === 0 && j % 2 === 0)) {
                tiles[i][j] = 1;
            }
        }
    }

    for (let i = 1; i < rows - 1; i++) {
        for (let j = 1; j < cols - 1; j++) {
            if (tiles[i][j] === 1) continue;
            if (Math.random() < 0.6) {
                tiles[i][j] = 2;
            }
        }
    }

    const safeZones = [
        [1, 1], [1, 2], [2, 1],
        [1, cols - 2], [1, cols - 3], [2, cols - 2],
        [rows - 2, 1], [rows - 2, 2], [rows - 3, 1],
        [rows - 2, cols - 2], [rows - 2, cols - 3], [rows - 3, cols - 2]
    ];

    safeZones.forEach(([row, col]) => {
        tiles[row][col] = 0;
    });

    return tiles;
}
