package main

import "math/rand/v2"

func generateMap() [][]int {
	rows, cols := 13, 15
	tiles := make([][]int, rows)
	for i := range tiles {
		tiles[i] = make([]int, cols)
	}

	for i := 0; i < rows; i++ {
		for j := 0; j < cols; j++ {
			if i == 0 || i == rows-1 || j == 0 || j == cols-1 || (i%2 == 0 && j%2 == 0) {
				tiles[i][j] = 1
			}
		}
	}

	for i := 1; i < rows-1; i++ {
		for j := 1; j < cols-1; j++ {
			if tiles[i][j] == 1 {
				continue
			}
			if rand.Float64() < 0.6 {
				tiles[i][j] = 2
			}
		}
	}

	safeZones := [][2]int{
		{1, 1},
		{1, 2},
		{2, 1},
		{1, cols - 2},
		{1, cols - 3},
		{2, cols - 2},
		{rows - 2, 1},
		{rows - 2, 2},
		{rows - 3, 1},
		{rows - 2, cols - 2},
		{rows - 2, cols - 3},
		{rows - 3, cols - 2},
	}
	for _, pos := range safeZones {
		tiles[pos[0]][pos[1]] = 0
	}

	return tiles
}
