import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { createRoot } from "react-dom/client";
import { Admin, Resource } from "react-admin";
// импортируем свой провайдер
import dataProvider from "./dataProvider";
import { QuestionList, QuestionEdit, QuestionCreate } from "./questions";
import { CategoryList, CategoryEdit, CategoryCreate } from "./categories";
import "./index.css";
const App = () => (_jsxs(Admin, { dataProvider: dataProvider, children: [_jsx(Resource, { name: "category", list: CategoryList, edit: CategoryEdit, create: CategoryCreate }), _jsx(Resource, { name: "question", list: QuestionList, edit: QuestionEdit, create: QuestionCreate })] }));
createRoot(document.getElementById("root")).render(_jsx(App, {}));
