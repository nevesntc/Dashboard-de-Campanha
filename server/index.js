const express = require('express');
const cors = require('cors');
const campaignRoutes = require('./routes/campaigns');


const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json()); // Para parsear JSON no corpo das requisições
app.use(express.urlencoded({ extended: true })); // Para parsear corpos urlencoded

// Rotas
app.use('/api/campaigns', campaignRoutes);


// Error Handling Middleware (deve ser o último middleware)
app.use((err, req, res, next) => {
  console.error("Global Error Handler:", err.stack);
  res.status(err.status || 500).json({
    message: err.message || 'Internal Server Error',
    // error: process.env.NODE_ENV === 'development' ? err : {} 
  });
});

// Iniciar o servidor apenas se não estiver no ambiente de teste
// Isso evita que o servidor tente iniciar quando os testes estão rodando,
// pois o supertest lida com o ciclo de vida do servidor para os testes.
if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

module.exports = app; // Exportar o app para os testes