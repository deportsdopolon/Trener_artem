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
    await page.goto("http://localhost:4175/trener_artem/");
    await page.getByRole("heading", { name: "Ваша неделя" }).waitFor();
    await page
      .getByRole("button", { name: "Добавить занятие", exact: true })
      .click();
    await page.getByLabel("Фамилия / имя").fill("Иванова");
    await page.getByLabel("Дата", { exact: true }).fill(dayKey(first));
    await page.getByRole("button", { name: "Сохранить", exact: true }).click();
    await page.getByRole("button", { name: /10:00 Иванова/ }).click();
    // Simulate existing v1 data without measurements; migration must preserve it.
    await page.evaluate(() => {
      const data = JSON.parse(localStorage.getItem("tonus-data-v1"));
      delete data.measurements;
      localStorage.setItem("tonus-data-v1", JSON.stringify(data));
    });
    await page.reload();
    await page.getByRole("button", { name: /10:00 Иванова/ }).click();
    await page.getByRole("button", { name: "Замеры", exact: true }).click();
    const measurements = page.getByRole("dialog", { name: "Замеры клиента" });
    await measurements
      .getByRole("button", { name: "Сохранить замеры" })
      .click();
    await measurements.getByText("Заполните хотя бы один замер.").waitFor();
    for (const [label, value] of [
      ["Руки, см", "32,5"],
      ["Талия, см", "70.2"],
      ["Ягодицы, см", "95"],
      ["Ноги, см", "55"],
      ["Плечи, см", "100"],
      ["Вес, кг", "62,4"],
    ]) {
      await measurements.getByLabel(label, { exact: true }).fill(value);
    }
    await measurements.getByLabel("Вес, кг", { exact: true }).fill("-1");
    await measurements
      .getByRole("button", { name: "Сохранить замеры" })
      .click();
    await measurements
      .getByText("Введите положительные числа с запятой или точкой.")
      .waitFor();
    await measurements.getByLabel("Вес, кг", { exact: true }).fill("62,4");
    // A storage failure must keep the form open and retain the entered values.
    await page.evaluate(() => {
      window.originalSetItem = Storage.prototype.setItem;
      Storage.prototype.setItem = () => {
        throw new Error("Quota exceeded");
      };
    });
    await measurements
      .getByRole("button", { name: "Сохранить замеры" })
      .click();
    await measurements.getByRole("alert").waitFor();
    assert.equal(
      await measurements.getByLabel("Вес, кг", { exact: true }).inputValue(),
      "62,4",
    );
    await page.evaluate(() => {
      Storage.prototype.setItem = window.originalSetItem;
    });
    await measurements
      .getByRole("button", { name: "Сохранить замеры" })
      .click();
    await page.reload();
    await page.getByRole("button", { name: /10:00 Иванова/ }).click();
    await page.getByRole("button", { name: "Замеры", exact: true }).click();
    assert.equal(
      await measurements.getByLabel("Руки, см", { exact: true }).inputValue(),
      "32.5",
    );
    assert.equal(
      await measurements.getByLabel("Вес, кг", { exact: true }).inputValue(),
      "62.4",
    );
    await measurements.getByLabel("Вес, кг", { exact: true }).fill("61.8");
    await measurements
      .getByRole("button", { name: "Сохранить замеры" })
      .click();
    await page.getByRole("button", { name: "Замеры", exact: true }).click();
    assert.equal(
      await measurements.locator(".measurement-history li").count(),
      2,
    );
    await measurements.getByText("62,4 кг", { exact: true }).waitFor();
    await measurements.getByText("61,8 кг", { exact: true }).waitFor();
    assert.equal(
      await page.evaluate(() => document.documentElement.scrollWidth),
      390,
    );
    const storedMeasurements = await page.evaluate(
      () => JSON.parse(localStorage.getItem("tonus-data-v1")).measurements,
    );
    assert.equal(storedMeasurements.length, 2);
    assert.ok(
      storedMeasurements.every(
        (m) => m.clientId && Number.isFinite(Date.parse(m.recordedAt)),
      ),
    );
    await measurements.getByRole("button", { name: "Закрыть" }).click();
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
    await page.getByRole("button", { name: "Добавить", exact: true }).click();
    await page.getByLabel("Фамилия / имя").fill("Петров");
    await page.getByRole("button", { name: "Сохранить", exact: true }).click();
    await page
      .getByRole("button", { name: /Петров Открыть тренировку/ })
      .click();
    await page.getByRole("button", { name: "Замеры", exact: true }).click();
    assert.equal(
      await measurements.getByLabel("Вес, кг", { exact: true }).inputValue(),
      "",
    );
    assert.equal(
      await measurements.locator(".measurement-history li").count(),
      0,
    );
    await measurements.getByRole("button", { name: "Закрыть" }).click();
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
    await page.getByRole("button", { name: "Замеры", exact: true }).click();
    assert.equal(
      await measurements.getByLabel("Вес, кг", { exact: true }).inputValue(),
      "61.8",
    );
    await measurements.getByLabel("Вес, кг", { exact: true }).fill("61,5");
    await measurements
      .getByRole("button", { name: "Сохранить замеры" })
      .click();
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
    assert.equal(
      await page.evaluate(
        () =>
          JSON.parse(localStorage.getItem("tonus-data-v1")).measurements.length,
      ),
      0,
    );
    assert.deepEqual(errors, []);
    console.log(
      "PASS: measurements, migration, validation, storage failure, client isolation, CRUD, sets, history, persistence, 390px layout, offline reload, cascading delete; no browser errors",
    );
  } finally {
    await browser?.close();
  }
} finally {
  server.kill();
}
