"use client";

import React, { useMemo, useState } from "react";
import { toast } from "react-toastify";
import { Badge } from "@/components/Badge";
import { Button, BtnStyle, Color } from "@/components/Button";
import { ConvictionBarChart } from "@/components/Charts/ConvictionBarChart";
import { DataTable } from "@/components/DataTable";
import { FormInput } from "@/components/Forms";
import { FormRadioButton } from "@/components/Forms/FormRadioButton";
import { FormSelect } from "@/components/Forms/FormSelect";
import { InfoWrapper } from "@/components/InfoWrapper";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { LoadingToast } from "@/components/LoadingToast";
import MarkdownEditor from "@/components/MarkdownEditor";
import { Skeleton } from "@/components/Skeleton";
import { TransactionStatusNotification } from "@/components/TransactionStatusNotification";

const sliderClass =
  "range range-md w-full bg-neutral-soft dark:bg-neutral [--range-shdw:var(--color-green-500)] dark:[--range-shdw:#4E9F80]";

const transactionStatuses: Array<{
  status: "idle" | "waiting" | "loading" | "success" | "error";
  message: string;
}> = [
  { status: "waiting", message: "Waiting for signature" },
  { status: "loading", message: "Transaction in progress" },
  { status: "success", message: "Transaction successful" },
  { status: "error", message: "Transaction failed" },
];

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
const buttonColors: Array<{ color: Color; label: string; disabled?: boolean }> = [
  { color: "primary", label: "Primary" },
  { color: "secondary", label: "Secondary" },
  { color: "tertiary", label: "Tertiary" },
  { color: "danger", label: "Danger" },
  { color: "disabled", label: "Disabled", disabled: true },
];

export default function DesignSystemPage() {
  const [radioValue, setRadioValue] = useState("option-a");
  const [textValue, setTextValue] = useState("100");
  const [sliderValue, setSliderValue] = useState(50);
  const [stakingSlider, setStakingSlider] = useState(75);
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
            </div>
          </DemoCard>

          <DemoCard title="Radio Buttons">
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
                type="number"
                value={textValue}
                onChange={(event) => setTextValue(event.target.value)}
              />
            </div>
          </DemoCard>

          <DemoCard title="Sliders">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium">
                  Budget allocation
                </label>
                <input
                  type="range"
                  className={sliderClass}
                  value={sliderValue}
                  onChange={(event) =>
                    setSliderValue(Number(event.target.value))
                  }
                />
                <p className="text-xs text-neutral-soft-content">
                  {sliderValue}% allocated to proposal
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium">
                  Staking slider
                </label>
                <input
                  type="range"
                  className={`${sliderClass} [--range-thumb-size:14px]`}
                  value={stakingSlider}
                  min={0}
                  max={100}
                  onChange={(event) =>
                    setStakingSlider(Number(event.target.value))
                  }
                />
                <p className="text-xs text-neutral-soft-content">
                  {stakingSlider}% of balance
                </p>
              </div>
            </div>
          </DemoCard>

          <DemoCard title="Toggle & Checkbox">
            <div className="flex flex-col gap-4">
              <label className="flex items-center gap-2">
                <input type="checkbox" className="toggle toggle-primary" />
                <span>Email notifications</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  className="checkbox checkbox-secondary"
                />
                <span>Accept terms</span>
              </label>
            </div>
          </DemoCard>

          <DemoCard title="Dropdown">
            <FormSelect
              registerKey="demo-select"
              options={[
                { label: "Ethereum", value: "Ethereum" },
                { label: "Polygon", value: "Polygon" },
                { label: "Optimism", value: "Optimism" },
                { label: "Arbitrum", value: "Arbitrum" },
              ]}
              value={"Polygon"}
            />
          </DemoCard>

          <DemoCard title="Markdown Editor">
            <MarkdownEditor
              id="design-markdown"
              value={markdownValue}
              onChange={(event) => setMarkdownValue(event?.target?.value ?? "")}
              className="min-h-[260px]"
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

          <DemoCard title="Transaction Notification States">
            <div className="space-y-4">
              {transactionStatuses.map((item) => (
                <div
                  key={item.status}
                  className="rounded-xl border border-neutral-soft p-4"
                >
                  <TransactionStatusNotification
                    status={item.status}
                    message={item.message}
                  />
                </div>
              ))}
            </div>
          </DemoCard>

          <DemoCard title="Badges & Info Wrapper">
            <div className="flex flex-col gap-4">
              <div className="flex flex-wrap gap-2">
                <Badge type={0} />
                <Badge type={1} />
                <Badge status={0} />
                <Badge status={2} />
              </div>
              <InfoWrapper tooltip="This is an info wrapper tooltip" size="md">
                <span className="text-sm">Hover to see additional context</span>
              </InfoWrapper>
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
    <div className="rounded-2xl border border-neutral-soft bg-neutral p-6 shadow-sm space-y-4">
      <h3 className="text-lg font-semibold">{title}</h3>
      {children}
    </div>
  );
}
