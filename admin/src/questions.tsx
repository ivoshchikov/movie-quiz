// src/questions.tsx
import React from "react";
import {
  List,
  Datagrid,
  TextField,
  EditButton,
  Edit,
  SimpleForm,
  TextInput,
  Create,
  ReferenceInput,
  SelectInput
} from "react-admin";

// Список вопросов
export const QuestionList = () => (
  <List>
    <Datagrid rowClick="edit">
      <TextField source="id" />
      <TextField source="image_url" label="Image URL" />
      <TextField source="correct_answer" label="Correct Answer" />
      <TextField source="options_json" label="Options (JSON)" />
      <TextField source="category_id" label="Category ID" />
      <EditButton />
    </Datagrid>
  </List>
);

// Редактирование вопроса
export const QuestionEdit = () => (
  <Edit>
    <SimpleForm>
      <TextInput source="image_url" label="Image URL" fullWidth />
      <TextInput source="correct_answer" label="Correct Answer" fullWidth />
      <TextInput source="options_json" label="Options (JSON)" fullWidth />
      <ReferenceInput source="category_id" reference="category">
        <SelectInput optionText="name" />
      </ReferenceInput>
    </SimpleForm>
  </Edit>
);

// Создание вопроса
export const QuestionCreate = () => (
  <Create>
    <SimpleForm>
      <TextInput source="image_url" label="Image URL" fullWidth />
      <TextInput source="correct_answer" label="Correct Answer" fullWidth />
      <TextInput source="options_json" label="Options (JSON)" fullWidth />
      <ReferenceInput source="category_id" reference="category">
        <SelectInput optionText="name" />
      </ReferenceInput>
    </SimpleForm>
  </Create>
);
