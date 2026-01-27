"use client";

import { useState, useEffect } from "react";
import { Service } from "@/types/database";

function SimplePage() {
  const [message, setMessage] = useState("Loading...");
  const [services, setServices] = useState<Service[]>([]);

  useEffect(() => {
    console.log("Simple page: useEffect running");

    fetch("/api/services/public")
      .then(response => {
        console.log("Simple page: Response received", response.status);
        return response.json();
      })
      .then(data => {
        console.log("Simple page: Data received", data);
        setServices(data.services || []);
        setMessage("Data loaded!");
      })
      .catch(error => {
        console.error("Simple page: Error", error);
        setMessage("Error loading data");
      });
  }, []);

  return (
    <div style={{ padding: "20px", color: "white", background: "black", minHeight: "100vh" }}>
      <h1>Simple Test Page</h1>
      <p>{message}</p>
      <p>Services count: {services.length}</p>
      {services.map((service) => (
        <div key={service.id}>
          <h3>{service.name}</h3>
          <p>{service.slug}</p>
        </div>
      ))}
    </div>
  );
}

export default SimplePage;