"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { faqs, FAQItem } from "./FAQData";

interface FAQProps {
  items?: FAQItem[];
  showCategories?: boolean;
  title?: string;
  subtitle?: string;
}

export function FAQ({
  items = faqs,
  showCategories = true,
  title = "Frequently Asked Questions",
  subtitle = "Everything you need to know about ApplyWise.",
}: FAQProps) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const categories = showCategories
    ? Array.from(new Set(items.map((item) => item.category)))
    : [];

  const filteredItems = (category?: string) =>
    category ? items.filter((item) => item.category === category) : items;

  return (
    <section id="faq" className="py-24 px-6">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">{title}</h2>
          <p className="text-zinc-500 text-lg">{subtitle}</p>
        </div>

        {showCategories ? (
          <div className="space-y-12">
            {categories.map((category) => (
              <div key={category}>
                <h3 className="text-sm font-semibold text-indigo-500 uppercase tracking-wider mb-4">
                  {category}
                </h3>
                <div className="space-y-3">
                  {filteredItems(category).map((item) => {
                    const globalIdx = items.indexOf(item);
                    return (
                      <FAQAccordionItem
                        key={globalIdx}
                        item={item}
                        isOpen={openIndex === globalIdx}
                        onToggle={() =>
                          setOpenIndex(openIndex === globalIdx ? null : globalIdx)
                        }
                      />
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            {items.map((item, idx) => (
              <FAQAccordionItem
                key={idx}
                item={item}
                isOpen={openIndex === idx}
                onToggle={() => setOpenIndex(openIndex === idx ? null : idx)}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

function FAQAccordionItem({
  item,
  isOpen,
  onToggle,
}: {
  item: FAQItem;
  isOpen: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="bg-white rounded-2xl border border-zinc-200 overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between p-6 text-left hover:bg-zinc-50 transition-colors"
      >
        <span className="font-medium text-zinc-900 pr-4">{item.question}</span>
        <ChevronDown
          className={`w-5 h-5 text-zinc-400 flex-shrink-0 transition-transform ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>
      {isOpen && (
        <div className="px-6 pb-6">
          <p className="text-zinc-500 leading-relaxed">{item.answer}</p>
        </div>
      )}
    </div>
  );
}
