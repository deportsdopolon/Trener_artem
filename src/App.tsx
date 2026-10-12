import { useState } from "react";
import {
  ArrowLeft,
  ArrowUpRight,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Plus,
  Dumbbell,
  Users,
  X,
  Trash2,
  Check,
  Pencil,
  Search,
  Ruler,
} from "lucide-react";

type Client = { id: string; name: string };
type Slot = { id: string; clientId: string; date: string; time: string };
type Exercise = { id: string; name: string };
type Set = { id: string; weight: string; reps: string };
type Entry = { id: string; exerciseId: string; name: string; sets: Set[] };
type Session = {
  clientId: string;
  date: string;
  focus: string;
  entries: Entry[];
};
const measurementFields = [
  ["arms", "Руки", "см"],
  ["waist", "Талия", "см"],
  ["hips", "Ягодицы", "см"],
  ["legs", "Ноги", "см"],
  ["shoulders", "Плечи", "см"],
  ["weight", "Вес", "кг"],
] as const;
type MeasurementValues = Record<(typeof measurementFields)[number][0], string>;
type Measurement = {
  id: string;
  clientId: string;
  recordedAt: string;
  values: MeasurementValues;
};
const emptyMeasurements = (): MeasurementValues => ({
  arms: "",
  waist: "",
  hips: "",
  legs: "",
  shoulders: "",
  weight: "",
});
const measurementDate = (value: string) =>
  new Date(value).toLocaleString("ru-RU", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
type Data = {
  measurements: Measurement[];
  clients: Client[];
  slots: Slot[];
  exercises: Exercise[];
  sessions: Session[];
};
const uid = () => crypto.randomUUID();
const names =
  "Разгибание бедра|Сгибание бедра|Вертикальная тяга|Вертикальная тяга уз. Хватом|Горизонтальная тяга|Жим ногами|Жим лежа|Жим сидя на плечи|Жим в наклоне|Отведение|Сведение|Разгибание ( брусья)|Брусья|Пресс|Бабочка|Обратная бабочка|Сведение в кроссовере|Жопомахи|Разгибание прямой ручкой|Разгибание канаткой|Сгибание прямой|Сгибание канаткой|Зад.дельта в крос.|Пуловер|Становая|Румынская|Протяжка|Молотки|Бицепс супинир.|Разгибание из за г.|Махи в сторону|Тяга в наклоне|Ягодичный мост|Выпады|Выпады на 1 в Смите|Гиперэкстензия|Гиперэкстензия на попу".split(
    "|",
  );
const key = "tonus-data-v1";
const initial = (): Data => {
  try {
    const s = localStorage.getItem(key);
    if (s) {
      const d = JSON.parse(s);
      if (
        ["clients", "slots", "exercises", "sessions"].every((k) =>
          Array.isArray(d[k]),
        )
      )
        return {
          ...d,
          measurements: Array.isArray(d.measurements) ? d.measurements : [],
        };
    }
  } catch {}
  return {
    measurements: [],
    clients: [],
    slots: [],
    sessions: [],
    exercises: names.map((name) => ({ id: uid(), name })),
  };
};
const dateKey = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const parseDate = (s: string) => new Date(s + "T12:00:00");
const today = dateKey(new Date());
const monday = (d: Date) => {
  const r = new Date(d);
  r.setDate(r.getDate() - ((r.getDay() + 6) % 7));
  return r;
};
const formatDate = (s: string) =>
  parseDate(s).toLocaleDateString("ru-RU", { day: "numeric", month: "long" });
const weekDays = [
  "Понедельник",
  "Вторник",
  "Среда",
  "Четверг",
  "Пятница",
  "Суббота",
  "Воскресенье",
];
export default function App() {
  const [data, setData] = useState<Data>(initial);
  const [tab, setTab] = useState("week");
  const [week, setWeek] = useState(monday(new Date()));
  const [active, setActive] = useState<{
    clientId: string;
    date: string;
  } | null>(null);
  const [modal, setModal] = useState<
    "slot" | "client" | "exercise" | "picker" | "measurements" | null
  >(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [clientId, setClientId] = useState("");
  const [date, setDate] = useState(today);
  const [time, setTime] = useState("10:00");
  const [query, setQuery] = useState("");
  const [error, setError] = useState("");
  const [measurementValues, setMeasurementValues] =
    useState<MeasurementValues>(emptyMeasurements);
  const [measurementError, setMeasurementError] = useState("");
  const [history, setHistory] = useState(false);
  const save = (next: Data) => {
    try {
      localStorage.setItem(key, JSON.stringify(next));
      setData(next);
      setError("");
      return true;
    } catch {
      setError("Не удалось сохранить. Возможно, память устройства заполнена.");
      return false;
    }
  };
  const close = () => {
    setModal(null);
    setEditId(null);
    setName("");
    setQuery("");
  };
  const openSlot = (day: string, slot?: Slot) => {
    setDate(day);
    setTime(slot?.time || "10:00");
    setClientId(slot?.clientId || data.clients[0]?.id || "new");
    setName("");
    setEditId(slot?.id || null);
    setModal("slot");
  };
  const session = active
    ? data.sessions.find(
        (s) => s.clientId === active.clientId && s.date === active.date,
      ) || { ...active, focus: "", entries: [] }
    : null;
  const updateSession = (s: Session) =>
    save({
      ...data,
      sessions: [
        ...data.sessions.filter(
          (x) => !(x.clientId === s.clientId && x.date === s.date),
        ),
        s,
      ],
    });
  const updateEntry = (entry: Entry) =>
    session &&
    updateSession({
      ...session,
      entries: session.entries.map((e) => (e.id === entry.id ? entry : e)),
    });
  const removeClient = (id: string) => {
    if (
      confirm("Удалить клиента, его расписание, историю тренировок и замеры?")
    )
      save({
        ...data,
        clients: data.clients.filter((c) => c.id !== id),
        slots: data.slots.filter((s) => s.clientId !== id),
        sessions: data.sessions.filter((s) => s.clientId !== id),
        measurements: data.measurements.filter((m) => m.clientId !== id),
      });
  };
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (modal === "slot") {
      const newClient = clientId === "new";
      const id = newClient ? uid() : clientId;
      if (newClient && !name.trim()) return;
      const slot = { id: editId || uid(), clientId: id, date, time };
      save({
        ...data,
        clients: newClient
          ? [...data.clients, { id, name: name.trim() }]
          : data.clients,
        slots: [...data.slots.filter((s) => s.id !== editId), slot],
      });
    } else if (modal === "client") {
      save({
        ...data,
        clients: editId
          ? data.clients.map((c) =>
              c.id === editId ? { ...c, name: name.trim() } : c,
            )
          : [...data.clients, { id: uid(), name: name.trim() }],
      });
    } else if (modal === "exercise") {
      save({
        ...data,
        exercises: editId
          ? data.exercises.map((x) =>
              x.id === editId ? { ...x, name: name.trim() } : x,
            )
          : [...data.exercises, { id: uid(), name: name.trim() }],
      });
    }
    close();
  };
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(week);
    d.setDate(d.getDate() + i);
    return dateKey(d);
  });
  const past = active
    ? data.sessions
        .filter((s) => s.clientId === active.clientId && s.date < active.date)
        .sort((a, b) => b.date.localeCompare(a.date))
    : [];
  const clientMeasurements = active
    ? data.measurements
        .filter((m) => m.clientId === active.clientId)
        .sort((a, b) => b.recordedAt.localeCompare(a.recordedAt))
    : [];
  const openMeasurements = () => {
    setMeasurementValues({
      ...emptyMeasurements(),
      ...clientMeasurements[0]?.values,
    });
    setMeasurementError("");
    setModal("measurements");
  };
  const saveMeasurements = (event: React.FormEvent) => {
    event.preventDefault();
    if (!active) return;
    const values = emptyMeasurements();
    for (const [field] of measurementFields) {
      const value = measurementValues[field].trim().replace(",", ".");
      if (
        value &&
        (!/^\d+(?:\.\d+)?$/.test(value) ||
          !Number.isFinite(Number(value)) ||
          Number(value) <= 0)
      ) {
        setMeasurementError(
          "Введите положительные числа с запятой или точкой.",
        );
        return;
      }
      values[field] = value ? String(Number(value)) : "";
    }
    if (!Object.values(values).some(Boolean)) {
      setMeasurementError("Заполните хотя бы один замер.");
      return;
    }
    if (
      save({
        ...data,
        measurements: [
          ...data.measurements,
          {
            id: uid(),
            clientId: active.clientId,
            recordedAt: new Date().toISOString(),
            values,
          },
        ],
      })
    )
      close();
    else
      setMeasurementError(
        "Не удалось сохранить. Проверьте свободное место и попробуйте ещё раз.",
      );
  };
  const openSession = (id: string, day: string) => {
    setActive({ clientId: id, date: day });
    setHistory(false);
  };
  return (
    <div className="app">
      <header className="brand">
        <span className="brand-icon">
          <Dumbbell size={20} />
        </span>
        <span>
          тонус<span className="brand-dot">.</span>
        </span>
        <span className="brand-caption">ДНЕВНИК ТРЕНЕРА</span>
        <span className="local">
          <i /> На устройстве
        </span>
      </header>
      {error && (
        <div role="alert" className="error">
          {error}
        </div>
      )}
      {active && session ? (
        <main>
          <button className="back" onClick={() => setActive(null)}>
            <ArrowLeft size={18} /> К расписанию
          </button>
          <div className="eyebrow">
            {formatDate(active.date)} ·{" "}
            {weekDays[(parseDate(active.date).getDay() + 6) % 7]}
          </div>
          <div className="client-heading">
            <button className="measurements-button" onClick={openMeasurements}>
              <Ruler size={18} /> Замеры
            </button>
            <h1>{data.clients.find((c) => c.id === active.clientId)?.name}</h1>
          </div>
          <div className="segmented">
            <button
              className={!history ? "selected" : ""}
              onClick={() => setHistory(false)}
            >
              Тренировка
            </button>
            <button
              className={history ? "selected" : ""}
              onClick={() => setHistory(true)}
            >
              История <span>{past.length}</span>
            </button>
          </div>
          {history ? (
            <div>
              {past.length === 0 ? (
                <Empty text="История появится после первой тренировки" />
              ) : (
                past.map((s) => (
                  <section className="card" key={s.date}>
                    <div className="section-title">
                      {formatDate(s.date)}
                      <button
                        className="text-button"
                        onClick={() => openSession(s.clientId, s.date)}
                      >
                        Открыть <ArrowUpRight size={16} />
                      </button>
                    </div>
                    {s.focus && <p className="muted">{s.focus}</p>}
                    {s.entries.map((e) => (
                      <div className="history-entry" key={e.id}>
                        <strong>{e.name}</strong>
                        <p>
                          {e.sets
                            .map(
                              (s) => `${s.weight || "—"} кг × ${s.reps || "—"}`,
                            )
                            .join(" · ")}
                        </p>
                      </div>
                    ))}
                  </section>
                ))
              )}
            </div>
          ) : (
            <>
              <section className="focus card">
                <label htmlFor="focus">
                  ФОКУС ДНЯ <span>Сверка на тренировку</span>
                </label>
                <input
                  id="focus"
                  placeholder="Например, спина и руки"
                  value={session.focus}
                  onChange={(e) =>
                    updateSession({ ...session, focus: e.target.value })
                  }
                />
                <div className="tags">
                  {["Ноги", "Спина", "Руки"].map((t) => (
                    <button
                      key={t}
                      onClick={() => updateSession({ ...session, focus: t })}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </section>
              <div className="section-title">
                <h2>Упражнения</h2>
                <span className="muted">{session.entries.length} в плане</span>
              </div>
              {session.entries.map((entry, index) => {
                const previous = past.find((s) =>
                  s.entries.some((e) => e.exerciseId === entry.exerciseId),
                );
                const prevEntry = previous?.entries.find(
                  (e) => e.exerciseId === entry.exerciseId,
                );
                return (
                  <section className="exercise-card card" key={entry.id}>
                    <div className="exercise-title">
                      <span className="index">
                        {String(index + 1).padStart(2, "0")}
                      </span>
                      <h3>
                        {data.exercises.find((e) => e.id === entry.exerciseId)
                          ?.name || entry.name}
                      </h3>
                      <button
                        className="icon-button"
                        aria-label="Удалить упражнение из тренировки"
                        onClick={() => {
                          if (confirm("Удалить упражнение и его подходы?"))
                            updateSession({
                              ...session,
                              entries: session.entries.filter(
                                (e) => e.id !== entry.id,
                              ),
                            });
                        }}
                      >
                        <X size={18} />
                      </button>
                    </div>
                    {prevEntry && (
                      <div className="previous">
                        <span>
                          В прошлый раз · {formatDate(previous!.date)}
                        </span>
                        <strong>
                          {prevEntry.sets
                            .map(
                              (s) => `${s.weight || "—"} кг × ${s.reps || "—"}`,
                            )
                            .join(" / ")}
                        </strong>
                        <button
                          onClick={() =>
                            updateEntry({
                              ...entry,
                              sets: prevEntry.sets.map((s) => ({
                                ...s,
                                id: uid(),
                              })),
                            })
                          }
                        >
                          Повторить подходы <ArrowUpRight size={14} />
                        </button>
                      </div>
                    )}
                    <div className="set-labels">
                      <span>ПОДХОД</span>
                      <span>ВЕС, КГ</span>
                      <span>ПОВТОРЫ</span>
                      <span />
                    </div>
                    {entry.sets.map((s, i) => (
                      <div className="set-row" key={s.id}>
                        <span className="set-num">{i + 1}</span>
                        <input
                          aria-label={`Вес подхода ${i + 1}`}
                          type="text"
                          inputMode="decimal"
                          placeholder="0"
                          value={s.weight}
                          onChange={(e) => {
                            if (/^\d{0,4}([.,]\d{0,2})?$/.test(e.target.value))
                              updateEntry({
                                ...entry,
                                sets: entry.sets.map((x) =>
                                  x.id === s.id
                                    ? { ...x, weight: e.target.value }
                                    : x,
                                ),
                              });
                          }}
                        />
                        <input
                          aria-label={`Повторы подхода ${i + 1}`}
                          type="text"
                          inputMode="numeric"
                          placeholder="0"
                          value={s.reps}
                          onChange={(e) => {
                            if (/^\d{0,3}$/.test(e.target.value))
                              updateEntry({
                                ...entry,
                                sets: entry.sets.map((x) =>
                                  x.id === s.id
                                    ? { ...x, reps: e.target.value }
                                    : x,
                                ),
                              });
                          }}
                        />
                        <button
                          className="icon-button"
                          aria-label="Удалить подход"
                          onClick={() =>
                            updateEntry({
                              ...entry,
                              sets: entry.sets.filter((x) => x.id !== s.id),
                            })
                          }
                        >
                          <X size={16} />
                        </button>
                      </div>
                    ))}
                    <button
                      className="add-set"
                      onClick={() =>
                        updateEntry({
                          ...entry,
                          sets: [
                            ...entry.sets,
                            { id: uid(), weight: "", reps: "" },
                          ],
                        })
                      }
                    >
                      <Plus size={16} /> Добавить подход
                    </button>
                  </section>
                );
              })}
              <button
                className="add-exercise"
                onClick={() => {
                  setModal("picker");
                  setQuery("");
                }}
              >
                <Plus size={24} />
                <span>
                  Добавить упражнение<small>Выберите из справочника</small>
                </span>
              </button>
              <p className="save-note">
                <Check size={14} /> Все изменения сохраняются автоматически
              </p>
            </>
          )}
        </main>
      ) : (
        <main>
          {tab === "week" ? (
            <>
              <div className="eyebrow">РАБОЧЕЕ ПРОСТРАНСТВО</div>
              <div className="heading">
                <h1>Ваша неделя</h1>
                <button
                  className="primary round"
                  aria-label="Добавить занятие"
                  onClick={() => openSlot(today)}
                >
                  <Plus />
                </button>
              </div>
              <p className="subtitle">Каждое занятие — шаг к результату.</p>
              <div className="week-control">
                <button
                  className="icon-button"
                  aria-label="Предыдущая неделя"
                  onClick={() => {
                    const d = new Date(week);
                    d.setDate(d.getDate() - 7);
                    setWeek(d);
                  }}
                >
                  <ChevronLeft size={20} />
                </button>
                <div>
                  <strong>
                    {parseDate(days[0]).getDate()} — {formatDate(days[6])}
                  </strong>
                  <button onClick={() => setWeek(monday(new Date()))}>
                    Текущая неделя
                  </button>
                </div>
                <button
                  className="icon-button"
                  aria-label="Следующая неделя"
                  onClick={() => {
                    const d = new Date(week);
                    d.setDate(d.getDate() + 7);
                    setWeek(d);
                  }}
                >
                  <ChevronRight size={20} />
                </button>
              </div>
              <div className="week-stats">
                <span>
                  <i />
                  {data.slots.filter((s) => days.includes(s.date)).length}{" "}
                  занятий на неделе
                </span>
                <span>ПН — ВС</span>
              </div>
              <div className="days">
                {days.map((day, i) => {
                  const slots = data.slots
                    .filter((s) => s.date === day)
                    .sort((a, b) => a.time.localeCompare(b.time));
                  return (
                    <section
                      className={`day ${day === today ? "today" : ""}`}
                      key={day}
                    >
                      <div className="day-header">
                        <span className="day-date">
                          {parseDate(day).getDate()}
                        </span>
                        <div>
                          <h2>{weekDays[i]}</h2>
                          <span>
                            {day === today
                              ? "Сегодня"
                              : parseDate(day).toLocaleDateString("ru-RU", {
                                  month: "long",
                                })}
                          </span>
                        </div>
                        <button
                          className="icon-button"
                          aria-label={`Добавить занятие ${weekDays[i]}`}
                          onClick={() => openSlot(day)}
                        >
                          <Plus size={20} />
                        </button>
                      </div>
                      {slots.length ? (
                        slots.map((slot) => (
                          <div className="slot" key={slot.id}>
                            <button
                              className="slot-open"
                              onClick={() => openSession(slot.clientId, day)}
                            >
                              <span className="time">{slot.time}</span>
                              <span>
                                <strong>
                                  {
                                    data.clients.find(
                                      (c) => c.id === slot.clientId,
                                    )?.name
                                  }
                                </strong>
                                <small>
                                  {data.sessions.find(
                                    (s) =>
                                      s.clientId === slot.clientId &&
                                      s.date === day,
                                  )?.focus || "Персональная тренировка"}
                                </small>
                              </span>
                              <ChevronRight size={17} />
                            </button>
                            <button
                              className="slot-edit icon-button"
                              aria-label="Редактировать занятие"
                              onClick={() => openSlot(day, slot)}
                            >
                              <Pencil size={15} />
                            </button>
                          </div>
                        ))
                      ) : (
                        <button
                          className="free-slot"
                          onClick={() => openSlot(day)}
                        >
                          Свободный день{" "}
                          <span>
                            Добавить занятие <Plus size={13} />
                          </span>
                        </button>
                      )}
                    </section>
                  );
                })}
              </div>
            </>
          ) : (
            <>
              <div className="eyebrow">
                {tab === "clients" ? "ВАША КОМАНДА" : "БИБЛИОТЕКА ДВИЖЕНИЙ"}
              </div>
              <div className="heading">
                <h1>{tab === "clients" ? "Клиенты" : "Упражнения"}</h1>
                <button
                  className="primary round"
                  aria-label="Добавить"
                  onClick={() => {
                    setName("");
                    setEditId(null);
                    setModal(tab === "clients" ? "client" : "exercise");
                  }}
                >
                  <Plus />
                </button>
              </div>
              <p className="subtitle">
                {tab === "clients"
                  ? `${data.clients.length} клиентов · личный прогресс каждого`
                  : `${data.exercises.length} упражнений для ваших тренировок`}
              </p>
              <div className="search">
                <Search size={18} />
                <input
                  aria-label="Поиск"
                  placeholder={
                    tab === "clients" ? "Найти клиента" : "Найти упражнение"
                  }
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
              </div>
              {(tab === "clients" ? data.clients : data.exercises)
                .filter((x) =>
                  x.name.toLowerCase().includes(query.toLowerCase()),
                )
                .map((item) => (
                  <div className="library-row" key={item.id}>
                    <span className="library-icon">
                      {tab === "clients" ? (
                        <Users size={18} />
                      ) : (
                        <Dumbbell size={18} />
                      )}
                    </span>
                    <button
                      className="library-name"
                      onClick={() => {
                        if (tab === "clients") openSession(item.id, today);
                        else {
                          setEditId(item.id);
                          setName(item.name);
                          setModal("exercise");
                        }
                      }}
                    >
                      {item.name}
                      {tab === "clients" && (
                        <small>Открыть тренировку на сегодня</small>
                      )}
                    </button>
                    <button
                      className="icon-button"
                      aria-label={`Переименовать ${item.name}`}
                      onClick={() => {
                        setEditId(item.id);
                        setName(item.name);
                        setModal(tab === "clients" ? "client" : "exercise");
                      }}
                    >
                      <Pencil size={16} />
                    </button>
                    <button
                      className="icon-button"
                      aria-label={`Удалить ${item.name}`}
                      onClick={() =>
                        tab === "clients"
                          ? removeClient(item.id)
                          : confirm(
                              "Удалить упражнение из справочника? История тренировок сохранится.",
                            ) &&
                            save({
                              ...data,
                              exercises: data.exercises.filter(
                                (x) => x.id !== item.id,
                              ),
                            })
                      }
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              {(tab === "clients" ? data.clients : data.exercises).filter((x) =>
                x.name.toLowerCase().includes(query.toLowerCase()),
              ).length === 0 && (
                <Empty
                  text={
                    query
                      ? "Ничего не найдено"
                      : tab === "clients"
                        ? "Добавьте первого клиента"
                        : "Добавьте упражнение"
                  }
                />
              )}
            </>
          )}
        </main>
      )}
      <nav>
        <button
          className={tab === "week" ? "active" : ""}
          onClick={() => {
            setTab("week");
            setActive(null);
            setQuery("");
          }}
        >
          <CalendarDays size={22} />
          <span>Неделя</span>
        </button>
        <button
          className={tab === "clients" ? "active" : ""}
          onClick={() => {
            setTab("clients");
            setActive(null);
            setQuery("");
          }}
        >
          <Users size={22} />
          <span>Клиенты</span>
        </button>
        <button
          className={tab === "exercises" ? "active" : ""}
          onClick={() => {
            setTab("exercises");
            setActive(null);
            setQuery("");
          }}
        >
          <Dumbbell size={22} />
          <span>Упражнения</span>
        </button>
      </nav>
      {modal && (
        <div className="overlay" onClick={close}>
          <section
            className="sheet"
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-title"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="handle" />
            <div className="section-title">
              <h2 id="modal-title">
                {modal === "measurements"
                  ? "Замеры клиента"
                  : modal === "slot"
                    ? editId
                      ? "Изменить занятие"
                      : "Новое занятие"
                    : modal === "picker"
                      ? "Выберите упражнение"
                      : modal === "client"
                        ? editId
                          ? "Изменить клиента"
                          : "Новый клиент"
                        : editId
                          ? "Изменить упражнение"
                          : "Новое упражнение"}
              </h2>
              <button
                className="icon-button"
                aria-label="Закрыть"
                onClick={close}
              >
                <X />
              </button>
            </div>
            {modal === "measurements" ? (
              <>
                <p className="muted">
                  {data.clients.find((c) => c.id === active?.clientId)?.name}
                </p>
                <p className="muted">
                  {clientMeasurements[0]
                    ? `Последнее обновление: ${measurementDate(clientMeasurements[0].recordedAt)}`
                    : "Замеров пока нет. Обхваты — в сантиметрах, вес — в килограммах."}
                </p>
                <form onSubmit={saveMeasurements}>
                  <div className="measurement-grid">
                    {measurementFields.map(([field, label, unit]) => (
                      <label key={field}>
                        {label}, {unit}
                        <input
                          type="text"
                          inputMode="decimal"
                          autoComplete="off"
                          placeholder="Например, 35,5"
                          value={measurementValues[field]}
                          onChange={(e) =>
                            setMeasurementValues({
                              ...measurementValues,
                              [field]: e.target.value,
                            })
                          }
                        />
                      </label>
                    ))}
                  </div>
                  {measurementError && (
                    <p role="alert" className="error">
                      {measurementError}
                    </p>
                  )}
                  <button className="primary submit" type="submit">
                    <Check size={18} /> Сохранить замеры
                  </button>
                  <p className="muted">
                    Сохранение добавляет новую запись с текущей датой. Пустые
                    поля можно оставить незаполненными.
                  </p>
                </form>
                <h3>История замеров</h3>
                {clientMeasurements.length === 0 ? (
                  <p className="muted">История появится после сохранения.</p>
                ) : (
                  <ol className="measurement-history">
                    {clientMeasurements.map((m) => (
                      <li className="card" key={m.id}>
                        <time dateTime={m.recordedAt}>
                          {measurementDate(m.recordedAt)}
                        </time>
                        <dl>
                          {measurementFields.map(([field, label, unit]) => (
                            <div key={field}>
                              <dt>{label}</dt>
                              <dd>
                                {m.values[field]
                                  ? `${m.values[field].replace(".", ",")} ${unit}`
                                  : "—"}
                              </dd>
                            </div>
                          ))}
                        </dl>
                      </li>
                    ))}
                  </ol>
                )}
              </>
            ) : modal === "picker" ? (
              <>
                <div className="search">
                  <Search size={18} />
                  <input
                    autoFocus
                    placeholder="Название упражнения"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                  />
                </div>
                <div className="picker-list">
                  {data.exercises
                    .filter((e) =>
                      e.name.toLowerCase().includes(query.toLowerCase()),
                    )
                    .map((e) => (
                      <button
                        key={e.id}
                        onClick={() => {
                          if (session)
                            updateSession({
                              ...session,
                              entries: [
                                ...session.entries,
                                {
                                  id: uid(),
                                  exerciseId: e.id,
                                  name: e.name,
                                  sets: [{ id: uid(), weight: "", reps: "" }],
                                },
                              ],
                            });
                          close();
                        }}
                      >
                        <Dumbbell size={18} />
                        {e.name}
                        <Plus size={18} />
                      </button>
                    ))}
                  {!data.exercises.some((e) =>
                    e.name.toLowerCase().includes(query.toLowerCase()),
                  ) && (
                    <Empty text="Нет совпадений. Добавьте упражнение в справочнике." />
                  )}
                </div>
              </>
            ) : (
              <form onSubmit={submit}>
                {modal === "slot" ? (
                  <>
                    <label>
                      Клиент
                      <select
                        value={clientId}
                        onChange={(e) => setClientId(e.target.value)}
                      >
                        {data.clients.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))}
                        <option value="new">+ Новый клиент</option>
                      </select>
                    </label>
                    {clientId === "new" && (
                      <label>
                        Фамилия / имя
                        <input
                          autoFocus
                          required
                          maxLength={80}
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          placeholder="Например, Иванова"
                        />
                      </label>
                    )}
                    <div className="form-grid">
                      <label>
                        Дата
                        <input
                          type="date"
                          required
                          value={date}
                          onChange={(e) => setDate(e.target.value)}
                        />
                      </label>
                      <label>
                        Время
                        <input
                          type="time"
                          required
                          value={time}
                          onChange={(e) => setTime(e.target.value)}
                        />
                      </label>
                    </div>
                  </>
                ) : (
                  <label>
                    {modal === "client"
                      ? "Фамилия / имя"
                      : "Название упражнения"}
                    <input
                      autoFocus
                      required
                      pattern=".*\S.*"
                      maxLength={100}
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder={
                        modal === "client"
                          ? "Например, Иванова"
                          : "Например, Жим лежа"
                      }
                    />
                  </label>
                )}
                <button className="primary submit" type="submit">
                  <Check size={18} /> Сохранить
                </button>
                {modal === "slot" && editId && (
                  <button
                    type="button"
                    className="delete"
                    onClick={() => {
                      if (
                        confirm(
                          "Удалить занятие? Записи тренировки сохранятся в истории клиента.",
                        )
                      ) {
                        save({
                          ...data,
                          slots: data.slots.filter((s) => s.id !== editId),
                        });
                        close();
                      }
                    }}
                  >
                    <Trash2 size={16} /> Удалить занятие
                  </button>
                )}
              </form>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
function Empty({ text }: { text: string }) {
  return (
    <div className="empty">
      <Dumbbell size={28} />
      <p>{text}</p>
    </div>
  );
}
