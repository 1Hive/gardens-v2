"use client";

import React, { useMemo, useState } from "react";
import {
  HandRaisedIcon,
  PencilSquareIcon,
  PlusIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";
import { noop } from "lodash-es";
import { toast } from "react-toastify";
import { Address } from "viem";
import { Badge } from "@/components/Badge";
import { Button, BtnStyle, Color } from "@/components/Button";
import { ConvictionBarChart } from "@/components/Charts/ConvictionBarChart";
import { DataTable } from "@/components/DataTable";
import { FormInput } from "@/components/Forms";
import { AddressListInput } from "@/components/Forms/AddressListInput";
import { FormAddressInput } from "@/components/Forms/FormAddressInput";
import { FormCheckBox } from "@/components/Forms/FormCheckBox";
import { FormRadioButton } from "@/components/Forms/FormRadioButton";
import { FormSelect } from "@/components/Forms/FormSelect";
import { InfoBox } from "@/components/InfoBox";
import { InfoWrapper } from "@/components/InfoWrapper";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { LoadingToast } from "@/components/LoadingToast";
import { Skeleton } from "@/components/Skeleton";
import { TransactionStatusNotification } from "@/components/TransactionStatusNotification";
import { WalletBalance } from "@/components/WalletBalance";

const toastButtons = [
  {
    label: "Show Loading Toast",
    handler: () => {
      toast.loading(
        React.createElement(LoadingToast, { message: "Pulling new data" }),
        {
          toastId: "ds-loading-toast",
          autoClose: 2500,
          closeOnClick: true,
          closeButton: false,
          icon: false,
          style: { width: "fit-content", marginLeft: "auto" },
        },
      );
    },
  },
  {
    label: "Show Success Toast",
    handler: () => {
      toast.success(
        React.createElement(TransactionStatusNotification, {
          status: "success",
          message: "Transaction ready to execute",
        }),
        { autoClose: 2500, closeOnClick: true, icon: false },
      );
    },
  },
  {
    label: "Show Error Toast",
    handler: () => {
      toast.error(
        React.createElement(TransactionStatusNotification, {
          status: "error",
          message: "User rejected the request",
        }),
        { autoClose: 2500, closeOnClick: true, icon: false },
      );
    },
  },
];

const sampleTableData = [
  { id: "1", name: "Alice", role: "Guardian", stake: "120.00" },
  { id: "2", name: "Bob", role: "Delegate", stake: "95.34" },
  { id: "3", name: "Charlie", role: "Supporter", stake: "65.50" },
];

const buttonStyles: BtnStyle[] = ["filled", "outline", "link", "ghost"];
const buttonColors: Array<{ color: Color; label: string; disabled?: boolean }> =
  [
    { color: "primary", label: "Primary" },
    { color: "secondary", label: "Secondary" },
    { color: "tertiary", label: "Tertiary" },
    { color: "danger", label: "Danger" },
    { color: "disabled", label: "Disabled", disabled: true },
  ];

const demoAddressList: Address[] = [
  "0x0000000000000000000000000000000000000001",
  "0x0000000000000000000000000000000000000002",
  "0x0000000000000000000000000000000000000003",
] as Address[];

export default function DesignSystemPage() {
  const [radioValue, setRadioValue] = useState("option-a");
  const [textValue, setTextValue] = useState("100");
  const [errorTextValue, setErrorTextValue] = useState("");
  const [selectValue, setSelectValue] = useState("Polygon");
  const [selectErrorValue, setSelectErrorValue] = useState("");
  const [addressValue, setAddressValue] = useState("");
  const [addressErrorValue, setAddressErrorValue] = useState("");
  const addressListRegister = useMemo(() => (() => undefined) as any, []);
  const addressListSetValue = useMemo(() => (() => undefined) as any, []);
  const [isCheckboxChecked, setIsCheckboxChecked] = useState(false);
  const [isCheckboxErrorChecked, setIsCheckboxErrorChecked] = useState(false);
  const [openModal, setOpenModal] = useState(false);
  const textInputErrors = useMemo(
    () => ({
      "demo-error-input": {
        message: "Looks like this value needs attention",
      },
    }),
    [],
  );
  const selectErrors = useMemo(
    () => ({
      "demo-select-error": {
        message: "Please choose a network",
      },
    }),
    [],
  );
  const addressErrors = useMemo(
    () => ({
      "demo-address-error": {
        message: "Enter a valid address or ENS name",
      },
    }),
    [],
  );
  const checkboxErrors = useMemo(
    () => ({
      "demo-checkbox-error": {
        message: "Please accept the terms",
      },
    }),
    [],
  );
  const [markdownValue, setMarkdownValue] = useState<string>(
    "# Welcome to the design system\n\nYou can **edit** this content to preview our Markdown editor.",
  );
  const [showContent, setShowContent] = useState(false);
  const tableColumns = useMemo(
    () => [
      {
        header: "Name",
        render: (item: (typeof sampleTableData)[number]) => item.name,
      },
      { header: "Role", render: (item: any) => item.role },
      {
        header: "Stake",
        render: (item: any) => `${item.stake} HNY`,
        className: "text-right",
      },
    ],
    [],
  );

  return (
    <div className="space-y-16 px-4 py-8">
      <Section title="Forms & Inputs">
        <div className="grid gap-8 md:grid-cols-2">
          <DemoCard title="Buttons">
            <div className="flex flex-col gap-5">
              {buttonStyles.map((style) => (
                <div key={style} className="flex flex-wrap items-center gap-3">
                  <span className="w-20 text-sm font-semibold capitalize">
                    {style}
                  </span>
                  <div className="flex flex-wrap gap-3">
                    {buttonColors.map(({ color, label, disabled }) => (
                      <Button
                        key={`${style}-${color}`}
                        btnStyle={style}
                        color={color}
                        disabled={disabled}
                      >
                        {label}
                      </Button>
                    ))}
                  </div>
                </div>
              ))}
              <div className="flex flex-wrap items-center gap-3">
                <span className="w-20 text-sm font-semibold capitalize">
                  Icons
                </span>
                <div className="flex flex-wrap gap-3">
                  <Button
                    btnStyle="filled"
                    className="!px-2"
                    icon={<PlusIcon className="h-5 w-5" />}
                  >
                    <span className="sr-only">Add</span>
                  </Button>
                  <Button
                    btnStyle="outline"
                    className="!px-2"
                    icon={<PencilSquareIcon className="h-5 w-5" />}
                  >
                    <span className="sr-only">Edit</span>
                  </Button>
                  <Button
                    btnStyle="ghost"
                    color="danger"
                    className="!px-2"
                    icon={<TrashIcon className="h-5 w-5" />}
                  >
                    <span className="sr-only">Delete</span>
                  </Button>
                  <Button
                    btnStyle="ghost"
                    color="disabled"
                    className="!px-2"
                    icon={<TrashIcon className="h-5 w-5" />}
                  >
                    <span className="sr-only">Disabled</span>
                  </Button>
                </div>
              </div>
            </div>
          </DemoCard>

          <DemoCard title="InfoBox">
            <div className="grid gap-4">
              <InfoBox infoBoxType="info" title="Informational">
                Useful neutral information for the user.
              </InfoBox>
              <InfoBox infoBoxType="success" title="Success">
                Everything worked as expected.
              </InfoBox>
              <InfoBox infoBoxType="warning" title="Warning">
                Something might need your attention.
              </InfoBox>
              <InfoBox infoBoxType="error" title="Error">
                Something went wrong that needs fixing.
              </InfoBox>
              <InfoBox infoBoxType="disabled" title="Disabled">
                This feature is currently disabled.
              </InfoBox>
            </div>
          </DemoCard>

          <DemoCard title="Badges & Info Wrapper">
            <div className="flex flex-col gap-4">
              <span className="w-20 text-sm font-semibold capitalize">
                Pool type:
              </span>
              <div className="flex flex-wrap gap-3">
                <Badge type={0} />
                <Badge type={1} />
              </div>
              <span className="w-20 text-sm font-semibold capitalize">
                Proposal status:
              </span>
              <div className="flex flex-wrap gap-3">
                <Badge status={0} icon={<HandRaisedIcon />} />
                <Badge status={1} icon={<HandRaisedIcon />} />
                <Badge status={2} icon={<HandRaisedIcon />} />
                <Badge status={3} icon={<HandRaisedIcon />} />
                <Badge status={4} icon={<HandRaisedIcon />} />
                <Badge status={5} icon={<HandRaisedIcon />} />
                <Badge status={6} icon={<HandRaisedIcon />} />
              </div>
              <span className="w-20 text-sm font-semibold capitalize">
                Badge color:
              </span>
              <div className="flex flex-wrap gap-3">
                <Badge color="info" label="Info" />
                <Badge color="success" label="Success" />
                <Badge color="warning" label="Warning" />
                <Badge color="danger" label="Danger" />
              </div>
              <InfoWrapper tooltip="This is an info wrapper tooltip" size="md">
                <span className="text-sm">Hover to see additional context</span>
              </InfoWrapper>
            </div>
          </DemoCard>

          <DemoCard title="Wallet Balance">
            <div className="flex flex-col gap-4">
              <WalletBalance
                label="Requested"
                tooltip="Requested amount compared to your wallet balance"
                askedAmount={BigInt("50000000000000000000000")} // 5 ETH in wei
                setIsEnoughBalance={noop}
                token="native"
              />
              <WalletBalance
                label="Requested"
                tooltip="Requested amount compared to your wallet balance"
                askedAmount={0n}
                setIsEnoughBalance={noop}
                token="native"
              />
            </div>
          </DemoCard>

          <DemoCard title="FormRadioButton">
            <div className="space-y-3">
              <FormRadioButton
                value="option-a"
                registerKey="demo-radio"
                checked={radioValue === "option-a"}
                label="Option A"
                description="Primary choice"
                onChange={(event) => setRadioValue(event.target.value)}
              />
              <FormRadioButton
                value="option-b"
                registerKey="demo-radio"
                checked={radioValue === "option-b"}
                label="Option B"
                description="Secondary choice"
                onChange={(event) => setRadioValue(event.target.value)}
              />
            </div>
          </DemoCard>

          <DemoCard title="Text Inputs">
            <div className="grid gap-4">
              <FormInput
                registerKey="demo-standard-input"
                label="Standard"
                value={textValue}
                onChange={(event) => setTextValue(event.target.value)}
              />
              <FormInput
                registerKey="demo-suffix-input"
                label="Suffix"
                type="number"
                placeholder="100.00"
                suffix="HNY"
                value={textValue}
                onChange={(event) => setTextValue(event.target.value)}
              />
              <FormInput
                label="With Error"
                type="text"
                registerKey="demo-error-input"
                value={errorTextValue}
                onChange={(event) => setErrorTextValue(event.target.value)}
                errors={textInputErrors}
                placeholder="Try entering an invalid value"
              />
              <FormInput
                label="Disabled"
                type="text"
                registerKey="demo-disabled-input"
                value={errorTextValue}
                onChange={(event) => setErrorTextValue(event.target.value)}
                errors={textInputErrors}
                disabled={true}
              />
            </div>
          </DemoCard>

          <DemoCard title="FormSelect">
            <div className="grid gap-4">
              <FormSelect
                registerKey="demo-select"
                label="Select Network"
                options={[
                  { label: "Ethereum", value: "Ethereum" },
                  { label: "Polygon", value: "Polygon" },
                  { label: "Optimism", value: "Optimism" },
                  { label: "Arbitrum", value: "Arbitrum" },
                ]}
                value={selectValue}
                onChange={(event) => setSelectValue(event.target.value)}
              />
              <FormSelect
                registerKey="demo-select-error"
                label="With Error"
                placeholder="Select a network"
                options={[
                  { label: "Ethereum", value: "Ethereum" },
                  { label: "Polygon", value: "Polygon" },
                  { label: "Optimism", value: "Optimism" },
                  { label: "Arbitrum", value: "Arbitrum" },
                ]}
                value={selectErrorValue}
                onChange={(event) => setSelectErrorValue(event.target.value)}
                errors={selectErrors}
              />
              <FormSelect
                registerKey="demo-select-disabled"
                label="Disabled"
                placeholder="Select a network"
                options={[
                  { label: "Ethereum", value: "Ethereum" },
                  { label: "Polygon", value: "Polygon" },
                  { label: "Optimism", value: "Optimism" },
                  { label: "Arbitrum", value: "Arbitrum" },
                ]}
                disabled={true}
              />
            </div>
          </DemoCard>

          <DemoCard title="FormAddressInput">
            <div className="grid gap-4">
              <FormAddressInput
                label="Safe Address"
                registerKey="demo-address"
                placeholder="0x..."
                value={addressValue}
                onChange={(event) => setAddressValue(event.target.value)}
              />
              <FormAddressInput
                label="With Error"
                registerKey="demo-address-error"
                placeholder="0x..."
                value={addressErrorValue}
                onChange={(event) => setAddressErrorValue(event.target.value)}
                errors={addressErrors}
              />
              <FormAddressInput
                label="Disabled"
                registerKey="demo-address-disabled"
                placeholder="0x..."
                value="0x0000000000000000000000000000000000000000"
                onChange={() => {}}
                disabled
              />
            </div>
          </DemoCard>

          <DemoCard title="AddressListInput">
            <div className="space-y-6">
              <AddressListInput
                label="Allowlist"
                registerKey="demo-address-list"
                addresses={demoAddressList}
                register={addressListRegister}
                setValue={addressListSetValue}
                errors={{}}
                pointSystemType={0}
                tooltip="Add individual addresses or paste a list"
                required
              />
            </div>
          </DemoCard>

          <DemoCard title="FormCheckBox">
            <div className="grid gap-4">
              <FormCheckBox
                label="I understand the terms"
                registerKey="demo-checkbox"
                value={isCheckboxChecked}
                onChange={(event) => setIsCheckboxChecked(event.target.checked)}
              />
              <FormCheckBox
                label="Must accept"
                registerKey="demo-checkbox-error"
                value={isCheckboxErrorChecked}
                onChange={(event) =>
                  setIsCheckboxErrorChecked(event.target.checked)
                }
                errors={checkboxErrors}
              />
              <FormCheckBox
                label="Disabled state"
                registerKey="demo-checkbox-disabled"
                value={false}
                disabled
              />
            </div>
          </DemoCard>

          <DemoCard title="Markdown Editor">
            <FormInput
              type="markdown"
              label="Description"
              registerKey="demo-markdown"
              value={markdownValue}
              onChange={(e) => setMarkdownValue(e.target.value)}
            />
          </DemoCard>
        </div>
      </Section>

      <Section title="Data Display">
        <div className="grid gap-8 md:grid-cols-2">
          <DemoCard title="Data Table">
            <DataTable
              title="Delegates"
              description="Example of our DataTable component"
              data={sampleTableData}
              columns={tableColumns}
              openModal={openModal}
              setOpenModal={setOpenModal}
            />
          </DemoCard>

          <DemoCard title="Conviction Chart">
            <div className="h-80">
              <ConvictionBarChart
                currentConvictionPct={45}
                thresholdPct={60}
                proposalSupportPct={52}
                proposalNumber={21}
                isSignalingType={false}
                compact={false}
                proposalStatus="active"
              />
            </div>
          </DemoCard>
        </div>
      </Section>

      <Section title="Utilities">
        <div className="grid gap-8 md:grid-cols-2">
          <DemoCard title="Loading States">
            <div className="flex flex-col items-start gap-4">
              <div className="flex items-center gap-3">
                <LoadingSpinner />
                <span>Loading spinner</span>
              </div>
              <Skeleton isLoading={!showContent} rows={3}>
                <div className="space-y-2">
                  <p className="font-medium">Loaded content</p>
                  <p className="text-neutral-soft-content text-sm">
                    Toggle skeleton to preview transitions between loading and
                    finished states.
                  </p>
                </div>
              </Skeleton>
              <Button
                size="sm"
                onClick={() => setShowContent((value) => !value)}
              >
                {showContent ? "Show Skeleton" : "Show Content"}
              </Button>
            </div>
          </DemoCard>

          <DemoCard title="Toast Variations">
            <div className="flex flex-wrap gap-3">
              {toastButtons.map((button) => (
                <Button key={button.label} size="sm" onClick={button.handler}>
                  {button.label}
                </Button>
              ))}
            </div>
          </DemoCard>
        </div>
      </Section>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-6">
      <header>
        <h2 className="text-2xl font-semibold">{title}</h2>
      </header>
      {children}
    </section>
  );
}

function DemoCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl bg-neutral p-6 shadow-sm space-y-4">
      <h3 className="text-lg font-semibold">{title}</h3>
      {children}
    </div>
  );
}
