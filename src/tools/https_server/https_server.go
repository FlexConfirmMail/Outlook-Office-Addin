package main

import (
	"flag"
	"fmt"
	"net/http"
)

func main() {
	var (
		root = flag.String("root", "web/", "root path")
	)
	flag.Parse()
	http.Handle("/", http.FileServer(http.Dir(*root)))
	err := http.ListenAndServeTLS(":10041", "cert.pem", "key.pem", nil)
	if err != nil {
		fmt.Printf("ERROR : %s", err)
	}
}
