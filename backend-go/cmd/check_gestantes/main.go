package main

import (
	"fmt"
	"backend-go/internal/config"
	"backend-go/internal/models"
)

func main() {
	config.InitDB()
	var gestantes []models.Gestante
	config.DB.Find(&gestantes)
	fmt.Printf("\n=== TOTAL GESTANTES: %d ===\n", len(gestantes))
	for _, g := range gestantes {
		fmt.Printf("Gestante ID: %d | Doc: '%s' | Nombre: '%s %s'\n", g.ID, g.NumeroIdentificacion, g.Nombres, g.Apellidos)
	}

	var users []models.User
	config.DB.Where("rol = ?", "GESTANTE").Find(&users)
	fmt.Printf("\n=== TOTAL USUARIOS GESTANTE: %d ===\n", len(users))
	for _, u := range users {
		fmt.Printf("User ID: %d | Email: '%s' | Nombre: '%s'\n", u.ID, u.Email, u.Nombre)
	}
}
