import BagFormClient from "@/components/bags/BagFormClient";
import { createBag } from "@/lib/bags/actions";

export default function NewBagPage() {
  return <BagFormClient mode="add" createAction={createBag} />;
}
