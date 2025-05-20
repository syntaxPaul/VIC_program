import tkinter as tk
from tkinter import ttk, messagebox
import sqlite3
from datetime import datetime
import os

class ChurchMemberApp:
    DATE_FIELDS = ["Date of Birth", "Date of Salvation", "Date of Baptism"]

    def __init__(self, root):
        self.root = root
        self.root.title("Victory in Christ – Member Registration")
        self.root.geometry("850x700")
        self.root.configure(bg="#f9f9f9")

        # Styling
        style = ttk.Style(self.root)
        style.theme_use('clam')
        style.configure('TNotebook', background='#f9f9f9', borderwidth=0)
        style.configure('TNotebook.Tab', background='#ffffff', padding=[14,8], font=('Helvetica',11,'bold'))
        style.map('TNotebook.Tab', background=[('selected','#e0e0e0')])
        style.configure('Header.TLabel', font=('Helvetica',18,'bold'), background='#f9f9f9', foreground='#333333')
        style.configure('TLabel', background='#ffffff', font=('Helvetica',11), foreground='#333333')
        style.configure('TButton', font=('Helvetica',11), padding=6)
        style.configure('Accent.TButton', background='#00529B', foreground='white')
        style.map('Accent.TButton', background=[('active','#003f7d')])
        style.configure('Card.TFrame', background='white', relief='raised', borderwidth=1)

        # Header
        header_frame = ttk.Frame(self.root, padding=10)
        header_frame.pack(fill='x')
        if os.path.exists("church_logo.png"):
            logo_img = tk.PhotoImage(file="church_logo.png")
            ttk.Label(header_frame, image=logo_img, background='#f9f9f9').pack(side='left', padx=(0,10))
            self.logo_img = logo_img
        ttk.Label(header_frame, text="Victory in Christ", style="Header.TLabel").pack(side='left')

        # Notebook / Tabs
        self.notebook = ttk.Notebook(self.root)
        self.tab1 = ttk.Frame(self.notebook, padding=20)
        self.tab2 = ttk.Frame(self.notebook, padding=20)
        self.tab3 = ttk.Frame(self.notebook, padding=20)
        self.tab4 = ttk.Frame(self.notebook, padding=20)
        self.notebook.add(self.tab1, text='1 • Member Info')
        self.notebook.add(self.tab2, text='2 • Church History')
        self.notebook.add(self.tab3, text='3 • Prayer Requests')
        self.notebook.add(self.tab4, text='🔍 Search')
        self.notebook.pack(expand=True, fill='both', padx=20, pady=10)

        # Tab 1: Personal Details + Ministry
        fields1 = [
            ("Surname", "entry"),
            ("Full Name", "entry"),
            ("Date of Birth", "entry"),
            ("Gender", ["Male","Female","Other"]),
            ("Street Address", "entry"),
            ("City", "entry"),
            ("State", "entry"),
            ("Postal Code", "entry"),
            ("Phone Number", "entry"),
            ("Email", "entry"),
            ("Children", "entry"),
            ("Marital Status", ["Single","Married","Divorced","Widowed"]),
            ("Areas of Interest", ["Choir","Teaching","Ushering","Music","Outreach"]),
            ("Ministry Involvement", ["Children","Youth","Young Adult","Adult"]),
        ]
        self.entries_1 = {}
        for i, (label, widget) in enumerate(fields1):
            ttk.Label(self.tab1, text=label + ":").grid(row=i, column=0, sticky="w", pady=6)
            if isinstance(widget, list):
                cb = ttk.Combobox(self.tab1, values=widget, state="readonly", width=30)
                cb.grid(row=i, column=1, pady=6, sticky="w")
                self.entries_1[label] = cb
            else:
                e = tk.Entry(self.tab1, width=33, fg='grey')
                e.grid(row=i, column=1, pady=6, sticky="w")
                self.entries_1[label] = e
                if label in self.DATE_FIELDS:
                    self._add_placeholder(e)
                    e.bind('<FocusIn>', lambda ev, entry=e: self._clear_placeholder(entry))
                    e.bind('<FocusOut>', lambda ev, entry=e: self._add_placeholder(entry))

        # Tab 2: Church History
        fields2 = [
            ("Date of Salvation","entry"),
            ("Date of Baptism","entry"),
            ("Previous Church","entry"),
            ("Previous Church City/State","entry"),
        ]
        self.entries_2 = {}
        for i, (label, widget) in enumerate(fields2):
            ttk.Label(self.tab2, text=label + ":").grid(row=i, column=0, sticky="w", pady=6)
            e = tk.Entry(self.tab2, width=33, fg='grey')
            e.grid(row=i, column=1, pady=6, sticky="w")
            self.entries_2[label] = e
            if label in self.DATE_FIELDS:
                self._add_placeholder(e)
                e.bind('<FocusIn>', lambda ev, entry=e: self._clear_placeholder(entry))
                e.bind('<FocusOut>', lambda ev, entry=e: self._add_placeholder(entry))

        # Tab 3: Prayer Requests
        ttk.Label(self.tab3, text="Prayer Requests:", font=('Helvetica',13,'bold')).pack(anchor="w", pady=(0,6))
        self.prayer_requests = tk.Text(self.tab3, height=6, width=60, bd=1, relief="solid")
        self.prayer_requests.pack(pady=(0,10))
        ttk.Button(self.tab3, text="⏪ Back", style="TButton",
                   command=lambda: self.notebook.select(self.tab2)).pack(side="left", padx=(0,10))
        ttk.Button(self.tab3, text="✅ Submit", style="Accent.TButton",
                   command=self.add_member).pack(side="left")

        # Tab 4: Search Results
        ttk.Label(self.tab4, text="Search by Name or Email:", font=('Helvetica',13)).pack(anchor="w", pady=(0,6))
        self.search_entry = ttk.Entry(self.tab4, width=40)
        self.search_entry.pack(side="left", padx=(0,10))
        ttk.Button(self.tab4, text="🔍 Search", style="Accent.TButton",
                   command=self.search_member).pack(side="left")

        # Initialize DB
        self.create_database()
        self.notebook.select(self.tab1)

    def _add_placeholder(self, entry):
        placeholder = 'YYYY-MM-DD'
        if not entry.get():
            entry.insert(0, placeholder)
            entry.config(fg='grey')

    def _clear_placeholder(self, entry):
        if entry.get() == 'YYYY-MM-DD':
            entry.delete(0, 'end')
            entry.config(fg='black')

    def create_database(self):
        self.conn = sqlite3.connect("church_members.db")
        c = self.conn.cursor()
        c.execute("""
            CREATE TABLE IF NOT EXISTS members (
                id INTEGER PRIMARY KEY,
                surname TEXT, full_name TEXT, dob TEXT, gender TEXT,
                address TEXT, city TEXT, state TEXT, postal_code TEXT,
                phone TEXT, email TEXT, children TEXT, marital_status TEXT,
                interests TEXT, salvation_date TEXT, baptism_date TEXT,
                previous_church TEXT, previous_church_location TEXT,
                ministry TEXT, prayer_requests TEXT, registration_date TEXT
            )
        """)
        self.conn.commit()

    def add_member(self):
        # Gather all inputs
        data = {
            **{k: v.get() for k, v in self.entries_1.items()},
            **{k: v.get() for k, v in self.entries_2.items()},
            "Prayer": self.prayer_requests.get("1.0", "end").strip(),
            "Date": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        }

        # Columns to insert (must match order of vals)
        cols = ",".join([
            "surname","full_name","dob","gender","address","city","state","postal_code",
            "phone","email","children","marital_status","interests","salvation_date",
            "baptism_date","previous_church","previous_church_location","ministry",
            "prayer_requests","registration_date"
        ])

        # Build the values list in the same order
        vals = [
            data.get("Surname"), data.get("Full Name"), data.get("Date of Birth"), data.get("Gender"),
            data.get("Street Address"), data.get("City"), data.get("State"), data.get("Postal Code"),
            data.get("Phone Number"), data.get("Email"), data.get("Children"), data.get("Marital Status"),
            data.get("Areas of Interest"), data.get("Date of Salvation"), data.get("Date of Baptism"),
            data.get("Previous Church"), data.get("Previous Church City/State"), data.get("Ministry Involvement"),
            data.get("Prayer"), data.get("Date")
        ]

        # Exactly one '?' per value
        placeholders = ",".join(["?"] * len(vals))

        # Execute insert
        self.conn.cursor().execute(
            f"INSERT INTO members ({cols}) VALUES ({placeholders})",
            vals
        )
        self.conn.commit()

        messagebox.showinfo("Success", "Member registered successfully!")
        self.clear_forms()
        self.notebook.select(self.tab1)

    def clear_forms(self):
        # Clear Tab 1 entries
        for label, widget in self.entries_1.items():
            if isinstance(widget, ttk.Combobox):
                widget.set("")
            else:
                widget.delete(0, "end")
                if label in self.DATE_FIELDS:
                    self._add_placeholder(widget)

        # Clear Tab 2 entries
        for label, widget in self.entries_2.items():
            widget.delete(0, "end")
            if label in self.DATE_FIELDS:
                self._add_placeholder(widget)

        # Clear prayer requests
        self.prayer_requests.delete("1.0", "end")

    def search_member(self):
        term = self.search_entry.get().strip()
        if not term:
            messagebox.showwarning("Input needed", "Please enter a name or email to search.")
            return

        cur = self.conn.cursor()
        cur.execute(
            "SELECT * FROM members WHERE full_name LIKE ? OR email LIKE ?",
            (f"%{term}%", f"%{term}%")
        )
        rows = cur.fetchall()
        cols = [description[0] for description in cur.description]

        win = tk.Toplevel(self.root)
        win.title(f"Search Results: {term}")
        win.geometry("600x500")
        container = ttk.Frame(win)
        container.pack(fill="both", expand=True, padx=10, pady=10)

        canvas = tk.Canvas(container, bg="#f9f9f9")
        scrollbar = ttk.Scrollbar(container, orient="vertical", command=canvas.yview)
        scroll_frame = ttk.Frame(canvas)
        scroll_frame.bind(
            "<Configure>", lambda e: canvas.configure(scrollregion=canvas.bbox("all"))
        )
        canvas.create_window((0,0), window=scroll_frame, anchor="nw")
        canvas.configure(yscrollcommand=scrollbar.set)
        canvas.pack(side="left", fill="both", expand=True)
        scrollbar.pack(side="right", fill="y")

        if rows:
            for row in rows:
                card = ttk.Frame(scroll_frame, style="Card.TFrame", padding=15)
                card.pack(fill="x", pady=8)
                for i, col in enumerate(cols):
                    ttk.Label(card,
                              text=col.replace('_', ' ').title() + ":",
                              font=('Helvetica',10,'bold'),
                              background='white').grid(row=i, column=0, sticky="w", pady=2)
                    ttk.Label(card,
                              text=row[i],
                              font=('Helvetica',10),
                              background='white').grid(row=i, column=1, sticky="w", pady=2, padx=(5,0))
        else:
            ttk.Label(container, text="No matches found.", font=('Helvetica',12)).pack(pady=20)


if __name__ == "__main__":
    root = tk.Tk()
    app = ChurchMemberApp(root)
    root.mainloop()
