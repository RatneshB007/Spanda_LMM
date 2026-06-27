import { API_URL } from './config';

async function get(action, params = {}) {
  const url = new URL(API_URL);
  url.searchParams.set('action', action);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  const res = await fetch(url.toString());
  const data = await res.json();
  if (data.error) throw new Error(data.error);
  return data;
}

async function post(action, payload) {
  const res = await fetch(API_URL, {
    method: 'POST',
    body: JSON.stringify({ action, data: payload }),
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error);
  return data;
}

export const api = {
  getAllResinBatches:      ()       => get('getAllResinBatches'),
  getResinBatch:          (id)     => get('getResinBatch', { id }),
  createResinBatch:       (data)   => post('createResinBatch', data),
  updateResinBatch:       (data)   => post('updateResinBatch', data),
  getAllExperiments:       ()       => get('getAllExperiments'),
  getExperiment:          (id)     => get('getExperiment', { id }),
  getExperimentsByResin:  (batchId)=> get('getExperimentsByResin', { batchId }),
  createExperiment:       (data)   => post('createExperiment', data),
  updateExperiment:       (data)   => post('updateExperiment', data),
};
