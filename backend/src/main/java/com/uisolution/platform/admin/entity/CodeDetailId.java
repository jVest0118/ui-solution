package com.uisolution.platform.admin.entity;

import lombok.*;
import java.io.Serializable;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode
public class CodeDetailId implements Serializable {
    private String groupCd;
    private String codeVal;
}
