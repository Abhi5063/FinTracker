'use client';

import { useState, useEffect } from 'react';
import AddExpenseModal from './AddExpenseModal';
import { type Expense } from '@/hooks/useExpenses';

export default function GlobalAddExpense() {
  const [modalOpen, setModalOpen] = useState(false);
  const [editExpense, setEditExpense] = useState<Expense | null>(null);

  useEffect(() => {
    const handler = (e: Event) => {
      const customEvent = e as CustomEvent<{ expense?: Expense }>;
      setEditExpense(customEvent.detail?.expense ?? null);
      setModalOpen(true);
    };
    window.addEventListener('fintrack:open-add-expense', handler);
    return () => window.removeEventListener('fintrack:open-add-expense', handler);
  }, []);

  return (
    <AddExpenseModal
      isOpen={modalOpen}
      onClose={() => { setModalOpen(false); setEditExpense(null); }}
      expenseToEdit={editExpense}
    />
  );
}
