import React, { useState, useEffect } from 'react';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { 
  Search, 
  Filter, 
  ChevronLeft, 
  ChevronRight,
  Calendar,
  User
} from 'lucide-react';
import { Execution, Agent } from '@/lib/types';
import { format } from 'date-fns';

interface ExecutionTableProps {
  executions: Execution[];
  agents: Agent[];
  onRowClick: (execution: Execution) => void;
}

export function ExecutionTable({ executions, agents, onRowClick }: ExecutionTableProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [agentFilter, setAgentFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  const items = Array.isArray(executions) ? executions : [];

  const filteredExecutions = items.filter(exec => {
    const output = exec.output ?? '';
    const matchesSearch = output.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        exec.id.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesAgent = agentFilter === 'all' || exec.agentId === agentFilter;
    const matchesStatus = statusFilter === 'all' || exec.status === statusFilter;
    return matchesSearch && matchesAgent && matchesStatus;
  });

  const totalPages = Math.ceil(filteredExecutions.length / itemsPerPage);
  const paginatedExecutions = filteredExecutions.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const getAgent = (id: string) => agents.find(a => a.id === id);
  
  const getStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed':
      case 'success':
        return <Badge className="bg-green-500/10 text-green-500 border-green-500/20">Completed</Badge>;
      case 'error':
      case 'failed':
        return <Badge className="bg-red-500/10 text-red-500 border-red-500/20">Error</Badge>;
      case 'running':
      case 'active':
        return <Badge className="bg-blue-500/10 text-blue-500 border-blue-500/20 animate-pulse">Running</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-4">
      {/* Filters Bar */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-card p-4 rounded-lg border shadow-sm">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input 
            placeholder="Search outputs or IDs..." 
            className="pl-10" 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        <div className="flex flex-wrap gap-2 w-full md:w-auto">
          <div className="flex items-center gap-2 min-w-[140px]">
            <Filter className="w-4 h-4 text-muted-foreground" />
            <Select value={agentFilter ?? ""} onValueChange={(val) => setAgentFilter(val ?? "all")}>
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Agent" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Agents</SelectItem>
                {agents.map(agent => (
                  <SelectItem key={agent.id} value={agent.id}>{agent.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Select value={statusFilter ?? ""} onValueChange={(val) => setStatusFilter(val ?? "all")}>
            <SelectTrigger className="h-9 w-[130px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="error">Error</SelectItem>
              <SelectItem value="running">Running</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-md border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[180px]">Date</TableHead>
                <TableHead>Agent</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead className="hidden sm:table-cell">Preview</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedExecutions.length > 0 ? (
                paginatedExecutions.map((exec) => {
                  const agent = getAgent(exec.agentId);
                  const output = exec.output ?? '';
                  return (
                    <TableRow 
                      key={exec.id} 
                      className="cursor-pointer hover:bg-muted/50 transition-colors"
                      onClick={() => onRowClick(exec)}
                    >
                      <TableCell className="whitespace-nowrap">
                        {format(new Date(exec.startedAt), 'MMM dd, HH:mm:ss')}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded bg-primary/10 flex items-center justify-center text-[10px] font-bold">
                            {agent?.name[0] || '?'}
                          </div>
                          <span className="font-medium">{agent?.name || 'Unknown'}</span>
                        </div>
                      </TableCell>
                      <TableCell>{getStatusBadge(exec.status)}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {exec.duration ? `${(exec.duration / 1000).toFixed(1)}s` : '--'}
                      </TableCell>
                      <TableCell className="hidden sm:table-cell max-w-[200px] truncate text-muted-foreground text-xs">
                        {output ? `${output.substring(0, 50)}${output.length > 50 ? '...' : ''}` : '—'}
                      </TableCell>
                    </TableRow>
                  );
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                    No executions found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between py-2">
          <div className="text-sm text-muted-foreground">
            Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, filteredExecutions.length)} of {filteredExecutions.length}
          </div>
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <div className="text-sm font-medium">
              {currentPage} / {totalPages}
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
