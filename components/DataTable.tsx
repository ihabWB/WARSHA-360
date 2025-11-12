import React, { useState } from 'react';
import { Download, Search } from 'lucide-react';

interface Column<T> {
  header: string;
  accessor: keyof T;
  render?: (item: T) => React.ReactNode;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  title: string;
  onAdd: () => void;
  renderActions: (item: T) => React.ReactNode;
}

declare const XLSX: any;


const DataTable = <T extends { id: string, name?: string }>(
    { columns, data, title, onAdd, renderActions }: DataTableProps<T>
) => {
    const [searchTerm, setSearchTerm] = useState('');

    const filteredData = data.filter(item => {
        return Object.values(item).some(value =>
            String(value).toLowerCase().includes(searchTerm.toLowerCase())
        );
    });

    const exportToExcel = () => {
        const worksheet = XLSX.utils.json_to_sheet(data);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Sheet1");
        XLSX.writeFile(workbook, `${title}.xlsx`);
    };

    return (
        <div className="bg-white p-6 rounded-lg shadow-md">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-semibold">{title}</h2>
                <div className="flex items-center gap-2">
                    <div className="relative">
                        <input
                            type="text"
                            placeholder="بحث..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="border rounded-md py-2 px-3 pr-10 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                    </div>
                    <button onClick={exportToExcel} className="bg-green-500 text-white px-4 py-2 rounded-md hover:bg-green-600 flex items-center gap-2">
                        <Download size={18} /> Excel
                    </button>
                    <button onClick={onAdd} className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700">
                        إضافة جديد
                    </button>
                </div>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-right">
                    <thead>
                        <tr className="bg-gray-100 border-b">
                            {columns.map((col, index) => (
                                <th key={index} className="p-3 font-semibold text-gray-600">{col.header}</th>
                            ))}
                            <th className="p-3 font-semibold text-gray-600">إجراءات</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredData.map((item) => (
                            <tr key={item.id} className="border-b hover:bg-gray-50">
                                {columns.map((col, index) => (
                                    <td key={index} className="p-3 text-gray-800">
                                        {col.render ? col.render(item) : String(item[col.accessor])}
                                    </td>
                                ))}
                                <td className="p-3">{renderActions(item)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default DataTable;