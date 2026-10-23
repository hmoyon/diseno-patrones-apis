// En modo ESM el objeto `jest` NO es global: se importa desde @jest/globals
import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import type { Request, Response } from 'express';
import { EmployeeController } from './employee.controller.js';
import type { IEmployeeRepository } from '../repositories/employee.repository.js';
import type { Employee, NewEmployee, UpdateEmployee } from '../domain/employee.js';
import { NotFoundError } from '../errors/app-error.js';

// ⚠️ Este archivo NO importa mongoose ni el modelo: el controlador se prueba
// contra un doble de prueba (mock) de la abstracción IEmployeeRepository.

describe('🧪 Unit Test: EmployeeController (Mantenibilidad & Testabilidad)', () => {
  let controller: EmployeeController;
  let mockRepository: jest.Mocked<IEmployeeRepository>;
  let mockResponse: Partial<Response>;
  let statusMock: jest.Mock;
  let jsonMock: jest.Mock;

  const fakeEmployee: Employee = {
    id: '6acd3d7639897115a38f6bfb',
    nombre: 'Andrés Mendoza',
    cargo: 'Arquitecto',
    departamento: 'TI',
    sueldo: 4000,
  };



  beforeEach(() => {
    // 1. Mock 100% aislado de la interfaz (cero dependencia de Mongoose)
    mockRepository = {
      findAll: jest.fn<IEmployeeRepository['findAll']>(),
      findById: jest.fn<IEmployeeRepository['findById']>(),
      create: jest.fn<IEmployeeRepository['create']>(),
      update: jest.fn<IEmployeeRepository['update']>(),
      delete: jest.fn<IEmployeeRepository['delete']>(),
    };

    // 2. Inyección de dependencias: el controlador recibe el mock
    controller = new EmployeeController(mockRepository);

    // 3. Mock del objeto Response de Express: res.status(...).json(...)
    jsonMock = jest.fn();
    statusMock = jest.fn().mockReturnValue({ json: jsonMock });
    mockResponse = { status: statusMock as unknown as Response['status'] };
  });

  it('Debería retornar 200 y la lista de empleados obtenida de la abstracción', async () => {
    const fakeEmployees = [fakeEmployee];
    mockRepository.findAll.mockResolvedValue(fakeEmployees);

    await controller.getAll({} as Request, mockResponse as Response);

    expect(statusMock).toHaveBeenCalledWith(200);
    expect(jsonMock).toHaveBeenCalledWith(
      expect.objectContaining({ success: true, data: fakeEmployees })
    );
    expect(mockRepository.findAll).toHaveBeenCalledTimes(1);
  });

  it('Debería retornar 200 y el empleado cuando existe el ID', async () => {
    mockRepository.findById.mockResolvedValue(fakeEmployee);
    const req = { params: { id: fakeEmployee.id } } as unknown as Request<{ id: string }>;

    await controller.getById(req, mockResponse as Response);

    expect(mockRepository.findById).toHaveBeenCalledWith(fakeEmployee.id);
    expect(statusMock).toHaveBeenCalledWith(200);
    expect(jsonMock).toHaveBeenCalledWith(
      expect.objectContaining({ success: true, data: fakeEmployee })
    );
  });

  it('Debería lanzar NotFoundError (404) cuando el ID no existe', async () => {
    mockRepository.findById.mockResolvedValue(null);
    const req = { params: { id: '650000000000000000000000' } } as unknown as Request<{ id: string }>;

    await expect(controller.getById(req, mockResponse as Response)).rejects.toThrow(NotFoundError);
    expect(statusMock).not.toHaveBeenCalled(); // la respuesta la arma el interceptor global
  });

  it('Debería retornar 201 y delegar la creación a la abstracción', async () => {
    const body: NewEmployee = { nombre: 'Andrés Mendoza', cargo: 'Arquitecto', departamento: 'TI', sueldo: 4000 };

    
    mockRepository.create.mockResolvedValue(fakeEmployee);
    const req = { body } as unknown as Request<{}, unknown, NewEmployee>;

    await controller.create(req, mockResponse as Response);

    expect(mockRepository.create).toHaveBeenCalledWith(body);
    expect(statusMock).toHaveBeenCalledWith(201);
    expect(jsonMock).toHaveBeenCalledWith(
      expect.objectContaining({ success: true, data: fakeEmployee })
    );
  });

  it('Debería actualizar y retornar 200 con el empleado actualizado', async () => {
    const changes: UpdateEmployee = { sueldo: 5200 };
    mockRepository.update.mockResolvedValue({ ...fakeEmployee, sueldo: 5200 });
    const req = { params: { id: fakeEmployee.id }, body: changes } as unknown as Request<{ id: string }, unknown, UpdateEmployee>;

    await controller.update(req, mockResponse as Response);

    expect(mockRepository.update).toHaveBeenCalledWith(fakeEmployee.id, changes);
    expect(statusMock).toHaveBeenCalledWith(200);
    expect(jsonMock).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ sueldo: 5200 }) })
    );
  });

  it('Debería eliminar y retornar 200 con data null', async () => {
    mockRepository.delete.mockResolvedValue(true);
    const req = { params: { id: fakeEmployee.id } } as unknown as Request<{ id: string }>;

    await controller.delete(req, mockResponse as Response);

    expect(mockRepository.delete).toHaveBeenCalledWith(fakeEmployee.id);
    expect(statusMock).toHaveBeenCalledWith(200);
    expect(jsonMock).toHaveBeenCalledWith(expect.objectContaining({ success: true, data: null }));
  });

  it('Debería propagar los errores de la persistencia hacia el interceptor global', async () => {
    mockRepository.findAll.mockRejectedValue(new Error('DB caída'));

    await expect(controller.getAll({} as Request, mockResponse as Response)).rejects.toThrow('DB caída');
    expect(statusMock).not.toHaveBeenCalled();
  });
});
