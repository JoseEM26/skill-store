import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { deleteAccountService } from '@/lib/auth/account';

export async function DELETE() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json(
      { error: 'Debes iniciar sesión para realizar esta acción' },
      { status: 401 }
    );
  }

  try {
    await deleteAccountService(session.user.id);
    return NextResponse.json(
      { success: true, message: 'Cuenta dada de baja exitosamente' },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Error desconocido al eliminar la cuenta',
      },
      { status: 500 }
    );
  }
}
