import React, { useRef } from "react";

export default function useModal() {
  const ref = useRef<HTMLDialogElement>(null);
  const openModal = () => ref.current?.showModal();
  const closeModal = () => ref.current?.close();

  return { ref, openModal, closeModal };
}
