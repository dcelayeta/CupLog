import BagFormClient from "@/components/bags/BagFormClient";
import { createBag } from "@/lib/bags/actions";
import { getBagById } from "@/lib/bags/queries";
import { getRoasterOptions } from "@/lib/roasters/queries";

export default async function NewBagPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string }>;
}) {
  const { from } = await searchParams;

  const [sourceBag, roasters] = await Promise.all([
    from ? getBagById(Number(from)) : null,
    getRoasterOptions(),
  ]);

  return (
    <BagFormClient
      mode="add"
      createAction={createBag}
      initialData={sourceBag ?? undefined}
      roasters={roasters}
    />
  );
}
