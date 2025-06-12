// admin/src/main.tsx
import React from "react";
import {createRoot} from "react-dom/client";
import {Admin, Resource} from "react-admin";
// импортируем свой провайдер
import dataProvider from "./dataProvider";

import {QuestionList, QuestionEdit, QuestionCreate} from "./questions";
import {CategoryList, CategoryEdit, CategoryCreate} from "./categories";
import "./index.css";

const App = () => (
  <Admin dataProvider={dataProvider}>
    <Resource
      name="category"
      list={CategoryList}
      edit={CategoryEdit}
      create={CategoryCreate}
    />
    <Resource
      name="question"
      list={QuestionList}
      edit={QuestionEdit}
      create={QuestionCreate}
    />
  </Admin>
);

createRoot(document.getElementById("root")!).render(<App />);
