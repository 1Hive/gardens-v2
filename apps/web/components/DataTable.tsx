import React from "react";
import { Modal } from "./Modal";

interface DataTableProps {
  title?: string;
  description?: string;
  data: any[] | undefined;
  columns: TableColumn[];
  footer?: React.ReactNode;
  className?: string;
  openModal: boolean;
  setOpenModal: (open: boolean) => void;
}

interface TableColumn {
  header: string | React.ReactNode;
  render: (item: any) => React.ReactNode;
  className?: string;
}

export const DataTable: React.FC<DataTableProps> = ({
  title,
  data,
  columns,
  footer,
  openModal,
  setOpenModal,
}) => {
  return (
    <Modal
      title={title}
      footer={footer}
      isOpen={openModal}
      onClose={() => setOpenModal(false)}
      size="ultra-large"
    >
      <div className="overflow-x-hidden max-h-[500px]">
        <div className="inline-block min-w-full py-2 align-middle sm:px-4 lg:px-6">
          <table className="min-w-full ">
            <thead className="sticky top-0 bg-none backdrop-blur-sm z-10">
              <tr className="text-[11px] uppercase tracking-wider">
                {columns.map((col) => (
                  <th
                    key={(col.header ?? "").toString()}
                    scope="col"
                    className={`py-2.5 sm:py-3.5 px-[1px]  ${col.className ?? ""}`}
                  >
                    <h6 className="text-sm">{col.header}</h6>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data &&
                data.map((item) => (
                  <tr key={item.id}>
                    {columns.map((col, i) => (
                      <td
                        // eslint-disable-next-line react/no-array-index-key
                        key={`col-${i}-${item.id}`}
                        className={`whitespace-nowrap py-1 pr-1 text-sm text-neutral-soft-content ${col.className ?? ""}`}
                      >
                        <div className="text-base font-normal leading-6 text-left">
                          {col.render(item)}
                        </div>
                      </td>
                    ))}
                  </tr>
                ))}
            </tbody>
            {/* {footer != null && (
              <tfoot>
                <tr>
                  <td className="pt-2 sm:table-cel" colSpan={columns.length}>
                    {footer}
                  </td>
                </tr>
              </tfoot>
            )} */}
          </table>
        </div>
      </div>
    </Modal>
  );
};
