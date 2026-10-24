import { Schema, model } from 'mongoose';

const employeeSchema = new Schema(
  {
    nombre: { type: String, required: true },
    cargo: { type: String, required: true },
    departamento: { type: String, required: true },
    sueldo: { type: Number, required: true },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

// Se mantiene la colección 'empleados' para conservar los datos ya registrados.
export const EmployeeModel = model('Employee', employeeSchema, 'empleados');
