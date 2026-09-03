import Link from "next/link";
import { db } from "@/lib/db";
import { saveExpense } from "@/lib/actions/finance";
import { formatDateInput } from "@/lib/format";
import { today } from "@/lib/demo";
import { Button, Card, CardHeader, Field, Input, PageHeader, Select, Textarea } from "@/components/ui";

export default async function NewExpensePage() {
  const [accounts, funds] = await Promise.all([
    db.account.findMany({ where: { type: "EXPENSE", isActive: true }, orderBy: { code: "asc" } }),
    db.fund.findMany({ where: { isActive: true }, orderBy: { sortOrder: "asc" } }),
  ]);

  const action = saveExpense.bind(null, null);

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader
        title="Record payment"
        description="Every payment is booked to both a fund and an expense category."
      />

      <form action={action}>
        <Card>
          <CardHeader title="Payment details" />
          <div className="grid gap-4 p-5 sm:grid-cols-2">
            <Field label="Date">
              <Input name="date" type="date" required defaultValue={formatDateInput(today())} />
            </Field>
            <Field label="Amount" hint="e.g. 1 250,00">
              <Input name="amount" required inputMode="decimal" placeholder="0,00" className="tnum" />
            </Field>

            <Field label="Expense category" className="sm:col-span-2">
              <Select name="accountId" required defaultValue="">
                <option value="" disabled>Choose a category…</option>
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>{a.code} · {a.name}</option>
                ))}
              </Select>
            </Field>

            <Field label="Fund" hint="Which pot of money this comes out of">
              <Select name="fundId" required defaultValue="">
                <option value="" disabled>Choose a fund…</option>
                {funds.map((f) => (
                  <option key={f.id} value={f.id}>{f.name}</option>
                ))}
              </Select>
            </Field>

            <Field label="Method">
              <Select name="method" defaultValue="EFT">
                <option value="EFT">EFT</option>
                <option value="CASH">Cash</option>
                <option value="CARD">Card</option>
                <option value="CHEQUE">Cheque</option>
                <option value="DEBIT_ORDER">Debit order</option>
                <option value="IN_KIND">In kind</option>
              </Select>
            </Field>

            <Field label="Description" className="sm:col-span-2">
              <Input name="description" required placeholder="e.g. Electricity — August" />
            </Field>

            <Field label="Paid to" optional>
              <Input name="payee" placeholder="Supplier or person" />
            </Field>
            <Field label="Reference" optional>
              <Input name="reference" placeholder="Invoice or receipt no." />
            </Field>
          </div>

          <div className="flex justify-end gap-2 border-t px-5 py-3">
            <Link href="/expenses"><Button type="button" variant="ghost">Cancel</Button></Link>
            <Button type="submit" variant="primary">Record payment</Button>
          </div>
        </Card>
      </form>
    </div>
  );
}
