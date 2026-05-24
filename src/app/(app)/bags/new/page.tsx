import BagFormClient from "@/components/bags/BagFormClient";
import { createBag } from "@/lib/bags/actions";
import { getBagById } from "@/lib/bags/queries";

export default async function NewBagPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string }>;
}) {
  const { from } = await searchParams;

  const sourceBag = from ? await getBagById(Number(from)) : null;

  return (
    <BagFormClient
      mode="add"
      createAction={createBag}
      initialData={sourceBag ?? undefined}
    />
  );
}
