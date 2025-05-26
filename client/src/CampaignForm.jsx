import React, { useState, useEffect } from 'react';

function CampaignForm({ onSubmit, onCancel, existingCampaign }) {
  const [campaignData, setCampaignData] = useState({
    name: '',
    start_date: '',
    end_date: '',
    budget: '',
    status: 'draft',
  });
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    if (existingCampaign) {
      setIsEditing(true);
      setCampaignData({
        name: existingCampaign.name || '',
        start_date: existingCampaign.start_date ? new Date(existingCampaign.start_date).toISOString().split('T')[0] : '',
        end_date: existingCampaign.end_date ? new Date(existingCampaign.end_date).toISOString().split('T')[0] : '',
        budget: existingCampaign.budget || '',
        status: existingCampaign.status || 'draft',
      });
    } else {
      setIsEditing(false);
      setCampaignData({
        name: '',
        start_date: '',
        end_date: '',
        budget: '',
        status: 'draft',
      });
    }
  }, [existingCampaign]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setCampaignData(prevData => ({
      ...prevData,
      [name]: value,
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const dataToSubmit = {
      ...campaignData,
      budget: campaignData.budget ? parseFloat(campaignData.budget) : null,
    };
    onSubmit(dataToSubmit, isEditing ? existingCampaign.id : null);
  };

  return (
    <form onSubmit={handleSubmit} style={{ marginBottom: '20px', padding: '20px', border: '1px solid #ccc' }}>
      <h2>{isEditing ? 'Editar Campanha' : 'Criar Nova Campanha'}</h2>
      <div>
        <label htmlFor="name">Nome: </label>
        <input
          type="text"
          id="name"
          name="name"
          value={campaignData.name}
          onChange={handleChange}
          required
        />
      </div>
      <div style={{ marginTop: '10px' }}>
        <label htmlFor="start_date">Data de Início: </label>
        <input
          type="date"
          id="start_date"
          name="start_date"
          value={campaignData.start_date}
          onChange={handleChange}
        />
      </div>
      <div style={{ marginTop: '10px' }}>
        <label htmlFor="end_date">Data de Término: </label>
        <input
          type="date"
          id="end_date"
          name="end_date"
          value={campaignData.end_date}
          onChange={handleChange}
        />
      </div>
      <div style={{ marginTop: '10px' }}>
        <label htmlFor="budget">Orçamento: </label>
        <input
          type="number"
          id="budget"
          name="budget"
          step="0.01"
          min="0"
          value={campaignData.budget}
          onChange={handleChange}
        />
      </div>
      <div style={{ marginTop: '10px' }}>
        <label htmlFor="status">Status: </label>
        <select id="status" name="status" value={campaignData.status} onChange={handleChange}>
          <option value="draft">Rascunho</option>
          <option value="active">Ativa</option>
          <option value="paused">Pausada</option>
          <option value="completed">Concluída</option>
          <option value="archived">Arquivada</option>
        </select>
      </div>
      <div style={{ marginTop: '20px' }}>
        <button type="submit">{isEditing ? 'Atualizar Campanha' : 'Criar Campanha'}</button>
        {onCancel && <button type="button" onClick={onCancel} style={{ marginLeft: '10px' }}>Cancelar</button>}
      </div>
    </form>
  );
}

export default CampaignForm;