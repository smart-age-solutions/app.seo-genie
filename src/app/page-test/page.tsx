"use client";

import { useState, useEffect } from "react";

export default function PageTest() {
  const [message, setMessage] = useState("Loading test page...");
  const [services, setServices] = useState<any[]>([]);

  useEffect(() => {
    console.log("PageTest: useEffect triggered");

    fetch("/api/services/public")
      .then(response => {
        console.log("PageTest: Response status:", response.status);
        return response.json();
      })
      .then(data => {
        console.log("PageTest: Data:", data);
        setServices(data.services || []);
        setMessage("Data loaded successfully!");
      })
      .catch(error => {
        console.error("PageTest: Error:", error);
        setMessage("Error loading data: " + error.message);
      });
  }, []);

  return (
    <div style={{ padding: "20px", background: "black", color: "white", minHeight: "100vh" }}>
      <h1>Test Page</h1>
      <p>{message}</p>
      <p>Services loaded: {services.length}</p>
      <ul>
        {services.map((service: any) => (
          <li key={service.id}>{service.name}</li>
        ))}
      </ul>
    </div>
  );
}