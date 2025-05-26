const db = require('../db'); // Se precisar verificar no banco

function validateCampaignId(req, res, next) {
  const id = parseInt(req.params.id);
  if (isNaN(id) || id <= 0) {
    return res.status(400).json({ message: 'Invalid campaign ID format. ID must be a positive integer.' });
  }
  // Opcional: Verificar se a campanha com este ID existe no banco
  // Exemplo:
  // db.query('SELECT id FROM campaigns WHERE id = $1', [id])
  //   .then(result => {
  //     if (result.rows.length === 0) {
  //       return res.status(404).json({ message: `Campaign with ID ${id} not found.` });
  //     }
  //     next();
  //   })
  //   .catch(err => next(err));
  // Por enquanto, apenas validando o formato:
  next();
}

module.exports = {
  validateCampaignId
};