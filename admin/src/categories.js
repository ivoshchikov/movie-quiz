import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { List, Datagrid, TextField, EditButton, Edit, SimpleForm, TextInput, Create } from "react-admin";
// Список категорий
export const CategoryList = () => (_jsx(List, { children: _jsxs(Datagrid, { rowClick: "edit", children: [_jsx(TextField, { source: "id" }), _jsx(TextField, { source: "name" }), _jsx(EditButton, {})] }) }));
// Редактирование категории
export const CategoryEdit = () => (_jsx(Edit, { children: _jsx(SimpleForm, { children: _jsx(TextInput, { source: "name" }) }) }));
// Создание категории
export const CategoryCreate = () => (_jsx(Create, { children: _jsx(SimpleForm, { children: _jsx(TextInput, { source: "name" }) }) }));
