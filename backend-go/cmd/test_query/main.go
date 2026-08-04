package main

import (
	"fmt"
	"strings"
	"backend-go/internal/config"
	"backend-go/internal/models"
)

func main() {
	config.InitDB()
	email := "1090448899@maternas.com"
	docNum := strings.TrimSpace(strings.Split(email, "@")[0])
	
	var gestante models.Gestante
	err := config.DB.Where("numero_identificacion = ?", docNum).First(&gestante).Error
	if err != nil {
		fmt.Printf("Error searching docNum '%s': %v\n", docNum, err)
	} else {
		fmt.Printf("FOUND GESTANTE! ID: %d, Name: %s %s\n", gestante.ID, gestante.Nombres, gestante.Apellidos)
	}
}
