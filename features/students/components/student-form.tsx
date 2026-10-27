"use client";

import { useActionState } from "react";

import { ActionMessage } from "@/components/ui/action-message";
import { SubmitButton } from "@/components/ui/submit-button";
import {
  createStudentAction,
  updateStudentAction,
} from "@/features/students/actions";
import { initialActionState } from "@/features/shared/action-state";

export type HouseOption = { id: string; name: string; code: string };
export type StudentFormValue = {
  id: string;
  studentNumber: string;
  firstName: string;
  lastName: string;
  otherNames: string | null;
  academicStatus: string;
  houseId: string;
};

const inputClass =
  "mt-1 min-h-10 w-full rounded-md border bg-white px-3 py-2 text-sm";

export function StudentForm({
  houses,
  student,
}: {
  houses: HouseOption[];
  student?: StudentFormValue;
}) {
  const [state, action] = useActionState(
    student ? updateStudentAction : createStudentAction,
    initialActionState,
  );
  return (
    <form
      action={action}
      className="grid gap-4 rounded-xl border bg-surface p-5 shadow-sm sm:grid-cols-2"
    >
      {student ? <input type="hidden" name="id" value={student.id} /> : null}
      <label className="text-xs font-medium">
        Student number
        <input
          name="studentNumber"
          defaultValue={student?.studentNumber}
          className={inputClass}
          required
        />
      </label>
      <label className="text-xs font-medium">
        House
        <select
          name="houseId"
          defaultValue={student?.houseId ?? ""}
          className={inputClass}
          required
        >
          <option value="" disabled>
            Select a house
          </option>
          {houses.map((house) => (
            <option key={house.id} value={house.id}>
              {house.name} ({house.code})
            </option>
          ))}
        </select>
      </label>
      <label className="text-xs font-medium">
        First name
        <input
          name="firstName"
          defaultValue={student?.firstName}
          className={inputClass}
          required
        />
      </label>
      <label className="text-xs font-medium">
        Last name
        <input
          name="lastName"
          defaultValue={student?.lastName}
          className={inputClass}
          required
        />
      </label>
      <label className="text-xs font-medium">
        Other names
        <input
          name="otherNames"
          defaultValue={student?.otherNames ?? ""}
          className={inputClass}
        />
      </label>
      <label className="text-xs font-medium">
        Academic status
        <select
          name="academicStatus"
          defaultValue={student?.academicStatus ?? "enrolled"}
          className={inputClass}
        >
          <option value="enrolled">Enrolled</option>
          <option value="suspended">Suspended</option>
          <option value="graduated">Graduated</option>
          <option value="withdrawn">Withdrawn</option>
        </select>
      </label>
      <div className="sm:col-span-2">
        <ActionMessage state={state} />
      </div>
      <div className="sm:col-span-2">
        <SubmitButton
          idleLabel={student ? "Save student" : "Add student"}
          pendingLabel="Saving"
        />
      </div>
    </form>
  );
}
