// admin/src/dataProvider.ts
import { DataProvider, fetchUtils } from "react-admin";

const apiUrl = "http://localhost:8000/admin/api";
const httpClient = fetchUtils.fetchJson;

const rawProvider = {
  getList: (resource: string) =>
    httpClient(`${apiUrl}/${resource}/list`).then(({ json }) => ({
      data: json,
      total: Array.isArray(json) ? json.length : 0,
    })),

  getOne: (resource: string, params: any) =>
    httpClient(`${apiUrl}/${resource}/${params.id}`).then(({ json }) => ({
      data: json,
    })),

  create: (resource: string, params: any) =>
    httpClient(`${apiUrl}/${resource}/create`, {
      method: "POST",
      body: JSON.stringify(params.data),
    }).then(({ json }) => ({
      data: { ...params.data, id: json.id },
    })),

  update: (resource: string, params: any) =>
    httpClient(`${apiUrl}/${resource}/update/${params.id}`, {
      method: "POST",
      body: JSON.stringify(params.data),
    }).then(({ json }) => ({
      data: json,
    })),

  delete: (resource: string, params: any) =>
    httpClient(`${apiUrl}/${resource}/delete/${params.id}`, {
      method: "DELETE",
    }).then(() => ({
      data: params.previousData!,
    })),

  // заглушки
  getMany:           () => Promise.resolve({ data: [], total: 0 }),
  getManyReference:  () => Promise.resolve({ data: [], total: 0 }),
  updateMany:        () => Promise.resolve({ data: [] }),
  deleteMany:        () => Promise.resolve({ data: [] }),
};

export default rawProvider as DataProvider;
