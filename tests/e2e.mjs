import { chromium } from "playwright";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
const server = spawn(
  process.execPath,
  [
    "node_modules/vite/bin/vite.js",
    "preview",
    "--host",
    "127.0.0.1",
    "--port",
    "4175",
    "--strictPort",
  ],
  { stdio: "ignore" },
);
try {
  for (let attempt = 0; attempt < 50; attempt++) {
    try {
      if ((await fetch("http://localhost:4175")).ok) break;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  const now = new Date();
  const first = new Date(now);
  first.setDate(first.getDate() - ((first.getDay() + 6) % 7));
  const last = new Date(first);
  last.setDate(last.getDate() + 6);
  const dayKey = (d) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  let browser;
  try {
    browser = await chromium.launch({ headless: true, args: ["--no-sandbox"] });
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
      isMobile: true,
      hasTouch: true,
    });
    const page = await context.newPage();
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto("http://localhost:4175/Trener_artem/");
    await page.getByRole("heading", { name: "Ваша неделя" }).waitFor();
    await page
      .getByRole("button", { name: "Добавить занятие", exact: true })
      .click();
    await page.getByLabel("Фамилия / имя").fill("Иванова");
    await page.getByLabel("Дата", { exact: true }).fill(dayKey(first));
    await page.getByRole("button", { name: "Сохранить", exact: true }).click();
    await page.getByRole("button", { name: /10:00 Иванова/ }).click();
    await page.getByLabel("ФОКУС ДНЯ").fill("Спина и руки");
    await page.getByRole("button", { name: /Добавить упражнение/ }).click();
    await page
      .getByPlaceholder("Название упражнения")
      .fill("Вертикальная тяга");
    await page
      .getByRole("button", { name: "Вертикальная тяга", exact: true })
      .click();
    await page.getByLabel("Вес подхода 1", { exact: true }).fill("40");
    await page.getByLabel("Повторы подхода 1", { exact: true }).fill("12");
    await page
      .getByRole("button", { name: "Добавить подход", exact: true })
      .click();
    await page.getByLabel("Вес подхода 2", { exact: true }).fill("42,5");
    await page.getByLabel("Повторы подхода 2", { exact: true }).fill("10");
    await page.reload();
    await page.getByRole("button", { name: /10:00 Иванова/ }).click();
    assert.equal(
      await page.getByLabel("Вес подхода 2", { exact: true }).inputValue(),
      "42,5",
    );
    await page.getByRole("button", { name: "К расписанию" }).click();
    await page
      .getByRole("button", { name: "Добавить занятие", exact: true })
      .click();
    await page.getByLabel("Дата", { exact: true }).fill(dayKey(last));
    await page.getByRole("button", { name: "Сохранить", exact: true }).click();
    await page
      .getByRole("button", { name: /10:00 Иванова/ })
      .last()
      .click();
    await page.getByRole("button", { name: /Добавить упражнение/ }).click();
    await page
      .getByPlaceholder("Название упражнения")
      .fill("Вертикальная тяга");
    await page
      .getByRole("button", { name: "Вертикальная тяга", exact: true })
      .click();
    await page
      .getByText("40 кг × 12 / 42,5 кг × 10", { exact: true })
      .waitFor();
    await page.getByRole("button", { name: "Повторить подходы" }).click();
    assert.equal(
      await page.getByLabel("Вес подхода 2", { exact: true }).inputValue(),
      "42,5",
    );
    await page.getByRole("button", { name: /История 1/ }).click();
    await page.getByText("Спина и руки", { exact: true }).waitFor();
    await page.getByRole("button", { name: "Упражнения", exact: true }).click();
    await page.getByRole("button", { name: "Добавить", exact: true }).click();
    await page
      .getByLabel("Название упражнения", { exact: true })
      .fill("Тестовое упражнение");
    await page.getByRole("button", { name: "Сохранить", exact: true }).click();
    await page
      .getByRole("button", { name: "Переименовать Тестовое упражнение" })
      .click();
    await page
      .getByLabel("Название упражнения", { exact: true })
      .fill("Новое название");
    await page.getByRole("button", { name: "Сохранить", exact: true }).click();
    page.on("dialog", (d) => d.accept());
    await page.getByRole("button", { name: "Удалить Новое название" }).click();
    await page.getByRole("button", { name: "Клиенты", exact: true }).click();
    await page.getByRole("button", { name: "Переименовать Иванова" }).click();
    await page.getByLabel("Фамилия / имя").fill("Иванова Анна");
    await page.getByRole("button", { name: "Сохранить", exact: true }).click();
    await page.getByRole("button", { name: "Неделя", exact: true }).click();
    assert.equal(
      await page.evaluate(() => document.documentElement.scrollWidth),
      390,
    );

    await page.waitForFunction(() => !!navigator.serviceWorker.controller, {
      timeout: 15000,
    });
    await context.setOffline(true);
    await page.reload();
    await page.getByRole("heading", { name: "Ваша неделя" }).waitFor();
    await page
      .getByRole("button", { name: /10:00 Иванова Анна/ })
      .last()
      .click();
    assert.equal(
      await page.getByLabel("Вес подхода 1", { exact: true }).inputValue(),
      "40",
    );
    await page
      .getByRole("button", { name: "Удалить подход", exact: true })
      .last()
      .click();
    assert.equal(
      await page
        .getByRole("button", { name: "Удалить подход", exact: true })
        .count(),
      1,
    );
    await page
      .getByRole("button", { name: "Удалить упражнение из тренировки" })
      .click();
    assert.equal(
      await page.getByLabel("Вес подхода 1", { exact: true }).count(),
      0,
    );
    await page.getByRole("button", { name: "К расписанию" }).click();
    await page
      .getByRole("button", { name: "Редактировать занятие" })
      .last()
      .click();
    await page
      .getByRole("button", { name: "Удалить занятие", exact: true })
      .click();
    await page.getByRole("button", { name: "Клиенты", exact: true }).click();
    await page.getByRole("button", { name: "Удалить Иванова Анна" }).click();
    assert.equal(
      await page.evaluate(
        () => JSON.parse(localStorage.getItem("tonus-data-v1")).sessions.length,
      ),
      0,
    );
    assert.deepEqual(errors, []);
    console.log(
      "PASS: CRUD, sets, history, persistence, 390px layout, offline reload, cascading delete; no browser errors",
    );
  } finally {
    await browser?.close();
  }
} finally {
  server.kill();
}
