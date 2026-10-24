import { isValidObjectId } from 'mongoose';
import { EmployeeModel } from '../models/employee.model.js';
import type { Employee, NewEmployee, UpdateEmployee } from '../domain/employee.js';
import type { IEmployeeRepository } from './employee.repository.js';

// Implementación concreta con MongoDB/Mongoose.
// Es el único lugar (junto al modelo y config/database) que conoce Mongoose.
export class MongoEmployeeRepository implements IEmployeeRepository {
  async findAll(): Promise<Employee[]> {
    const docs = await EmployeeModel.find().lean();
    return docs.map(toEntity);
  }

  async findById(id: string): Promise<Employee | null> {
    if (!isValidObjectId(id)) return null;
    const doc = await EmployeeModel.findById(id).lean();
    return doc ? toEntity(doc) : null;
  }

  async create(data: NewEmployee): Promise<Employee> {
    const doc = await EmployeeModel.create(data);
    return toEntity(doc.toObject());
  }

  async update(id: string, data: UpdateEmployee): Promise<Employee | null> {
    if (!isValidObjectId(id)) return null;
    const doc = await EmployeeModel.findByIdAndUpdate(id, data, {
      returnDocument: 'after', // devuelve el documento ya actualizado
      runValidators: true,
    }).lean();
    return doc ? toEntity(doc) : null;
  }

  async delete(id: string): Promise<boolean> {
    if (!isValidObjectId(id)) return false;
    const doc = await EmployeeModel.findByIdAndDelete(id).lean();
    return doc !== null;
  }
}

// Traduce el documento de Mongo a la entidad de dominio (_id -> id).
interface EmployeeRecord {
  _id: { toString(): string };
  nombre: string;
  cargo: string;
  departamento: string;
  sueldo: number;
  createdAt?: Date;
  updatedAt?: Date;
}

function toEntity(doc: EmployeeRecord): Employee {
  const employee: Employee = {
    id: doc._id.toString(),
    nombre: doc.nombre,
    cargo: doc.cargo,
    departamento: doc.departamento,
    sueldo: doc.sueldo,
  };
  if (doc.createdAt) employee.createdAt = doc.createdAt;
  if (doc.updatedAt) employee.updatedAt = doc.updatedAt;
  return employee;
}
