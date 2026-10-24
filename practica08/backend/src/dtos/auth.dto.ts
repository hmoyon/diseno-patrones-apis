import { z } from 'zod';

// DTO del login: blinda el body antes de llegar al controlador.
export const LoginDto = z.object({
  email: z
    .string({ error: 'El correo electrónico es obligatorio' })
    .trim()
    .toLowerCase()
    .email('El formato del correo electrónico no es válido'),
  password: z
    .string({ error: 'La contraseña es obligatoria' })
    .min(6, 'La contraseña debe tener al menos 6 caracteres'),
});

export type LoginInput = z.infer<typeof LoginDto>;