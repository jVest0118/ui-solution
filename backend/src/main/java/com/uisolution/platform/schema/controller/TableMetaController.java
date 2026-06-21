package com.uisolution.platform.schema.controller;

import com.uisolution.platform.biz.service.DynamicTableService;
import com.uisolution.platform.common.dto.ApiResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/schema/admin/db-meta")
@RequiredArgsConstructor
public class TableMetaController {

    private final DynamicTableService dynamicTableService;

    @GetMapping("/tables")
    public ApiResponse<List<String>> listTables(
            @RequestParam(required = false) String dbConnId) {
        return ApiResponse.ok(dynamicTableService.listTables(dbConnId));
    }

    @GetMapping("/tables/{tableName}/columns")
    public ApiResponse<List<Map<String, Object>>> listColumns(
            @PathVariable String tableName,
            @RequestParam(required = false) String dbConnId) {
        return ApiResponse.ok(dynamicTableService.listColumns(tableName, dbConnId));
    }
}
