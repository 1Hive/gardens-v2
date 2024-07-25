import { useRef, useCallback } from "react";

export default function useModal() {
  const ref = useRef<HTMLDialogElement>(null);

  const openModal = useCallback(() => ref.current?.showModal(), []);
  const closeModal = useCallback(() => ref.current?.close(), []);

  return { ref, openModal, closeModal };
}