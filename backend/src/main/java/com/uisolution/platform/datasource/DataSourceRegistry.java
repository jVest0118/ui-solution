package com.uisolution.platform.datasource;

import org.springframework.stereotype.Component;

import javax.sql.DataSource;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

@Component
public class DataSourceRegistry {

    private final Map<String, DataSource> sources = new ConcurrentHashMap<>();
    private final Map<String, String>     errors  = new ConcurrentHashMap<>();

    public void register(String connId, DataSource ds) {
        sources.put(connId, ds);
        errors.remove(connId);
    }

    public void registerError(String connId, String message) {
        errors.put(connId, message);
        sources.remove(connId);
    }

    public Optional<DataSource> get(String connId) {
        return Optional.ofNullable(sources.get(connId));
    }

    public boolean isRegistered(String connId) {
        return sources.containsKey(connId);
    }

    public boolean hasError(String connId) {
        return errors.containsKey(connId);
    }

    public String getError(String connId) {
        return errors.get(connId);
    }

    public Set<String> registeredIds() {
        return Collections.unmodifiableSet(sources.keySet());
    }

    public Map<String, DataSource> getAll() {
        return Collections.unmodifiableMap(sources);
    }
}
